"""Bake de posiciones para la nube (spec 13 §3.6, §6).
uso: blender -b --python assets-source/tools/bake_positions.py -- [--shape nombre] [--lod lod2|mobile]
Sin args: todas las formas, todos los LODs."""
import bpy, bmesh, json, math, os, sys, datetime, zlib
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from surface_structure import lattice_surface, surface_links
from mathutils import Vector, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
CFG_PATH = os.path.join(ROOT, 'assets-source', 'tools', 'shapes.json')

# ---------- utilidades puras (testeables) ----------
def seeds(count, seed):
    """mulberry32 → float32 en [0,1), determinista por índice."""
    out = np.empty(count, dtype=np.float32)
    s = np.uint32(seed)
    for i in range(count):
        s = np.uint32(s + np.uint32(0x6D2B79F5))
        t = np.uint32(s)
        t = np.uint32((t ^ (t >> np.uint32(15))) * (np.uint32(1) | t))
        t = np.uint32((t + np.uint32((t ^ (t >> np.uint32(7))) * (np.uint32(61) | t))) ^ t)
        out[i] = float(np.uint32(t ^ (t >> np.uint32(14)))) / 4294967296.0
    return out

def _axes_to_transpose(x, bits):
    """Skilling: coordenadas enteras (n dims) → índice Hilbert transpuesto. x: array (n,) uint."""
    n = len(x); x = x.copy()
    M = 1 << (bits - 1)
    Q = M
    while Q > 1:
        P = Q - 1
        for i in range(n):
            if x[i] & Q:
                x[0] ^= P
            else:
                t = (x[0] ^ x[i]) & P; x[0] ^= t; x[i] ^= t
        Q >>= 1
    for i in range(1, n):
        x[i] ^= x[i - 1]
    t = 0; Q = M
    while Q > 1:
        if x[n - 1] & Q: t ^= Q - 1
        Q >>= 1
    for i in range(n):
        x[i] ^= t
    return x

def hilbert_order(points, bits=8):
    """Índices que ordenan `points` (N,3 en [-1,1]) a lo largo de una curva de Hilbert 3D."""
    q = np.clip(((points + 1.0) * 0.5 * ((1 << bits) - 1)).round(), 0, (1 << bits) - 1).astype(np.uint32)
    keys = np.empty(len(q), dtype=np.uint64)
    for i, p in enumerate(q):
        tr = _axes_to_transpose(p, bits)
        key = 0
        for b in range(bits - 1, -1, -1):
            for d in range(3):
                key = (key << 1) | ((int(tr[d]) >> b) & 1)
        keys[i] = key
    return np.argsort(keys, kind='stable')

# ---------- Blender ----------
def import_glb(path, exclude=None):
    """Importa un GLB y devuelve sus mallas.

    `exclude`: nombres base de objetos a descartar (mismo criterio que
    `explode`). Se borran ANTES de medir los limites, asi que la pieza excluida
    no cuenta ni para el encuadre ni para el reparto de particulas por area --
    que es justo el punto: el `Suelo_Disco` de `riego.glb` es el 82 % de la
    superficie del modelo y se llevaria 4 de cada 5 particulas del aspersor.
    """
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, path))
    objs = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    if exclude:
        names = {o.name.split('.')[0] for o in objs}
        missing = [k for k in exclude if k not in names]
        if missing:
            print('ERROR exclude: mallas sin match', missing, 'en', path, 'disponibles', sorted(names))
            sys.exit(2)
        keep = []
        for o in objs:
            if o.name.split('.')[0] in exclude:
                bpy.data.objects.remove(o, do_unlink=True)
            else:
                keep.append(o)
        objs = keep
    return sorted(objs, key=lambda o: o.name)

def object_bounds(objs):
    mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
    return mn, mx

def hex_to_rgb8(h):
    h = h.lstrip('#'); return [int(h[i:i + 2], 16) for i in (0, 2, 4)]

def triangles_world(objs, explode=None, max_dim=1.0, colors=None, components=False, animate=None):
    """Lista de (tri 3x3 float32, área) en mundo, aplicando explode por nombre de objeto.
    Si `colors` (material base name -> hex) está definido, devuelve también un
    color RGB8 por triángulo según el material de la cara (blanco si no hay match).
    Con `components=True` devuelve además el grupo (objeto) de cada triángulo y
    una marca 0/1 por triángulo: 1 si su material está en `animate` (lista de
    nombres base) -- las partículas de esos materiales se animan solas en el
    shader (la llama del logo)."""
    tris = []; areas = []; tri_colors = []; groups = []; tri_anim = []
    for group_id, o in enumerate(objs):
        dep = bpy.context.evaluated_depsgraph_get()
        me = o.evaluated_get(dep).to_mesh()
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.triangulate(bm, faces=bm.faces)
        off = Vector((0, 0, 0))
        if explode:
            base = o.name.split('.')[0]
            if base in explode:
                off = Vector(explode[base]) * max_dim
        mat_rgb = None
        if colors is not None:
            mat_rgb = []
            for slot in o.material_slots:
                mname = slot.material.name.split('.')[0] if slot.material else ''
                mat_rgb.append(hex_to_rgb8(colors.get(mname, '#ffffff')))
            if not mat_rgb: mat_rgb = [[255, 255, 255]]
        mat_anim = []
        for slot in o.material_slots:
            mname = slot.material.name.split('.')[0] if slot.material else ''
            mat_anim.append(1 if animate and mname in animate else 0)
        if not mat_anim: mat_anim = [0]
        for f in bm.faces:
            v = [(o.matrix_world @ vv.co) + off for vv in f.verts]
            tris.append([[p.x, p.y, p.z] for p in v])
            groups.append(group_id)
            if mat_rgb is not None:
                tri_colors.append(mat_rgb[min(f.material_index, len(mat_rgb) - 1)])
            tri_anim.append(mat_anim[min(f.material_index, len(mat_anim) - 1)])
            # Área EN MUNDO, no `f.calc_area()`: esa es el área en espacio local
            # de la malla e ignora la escala de `o.matrix_world`. Con objetos de
            # escala muy distinta (en nodo.glb, `Chassis_ClipTab` es un cubo
            # unitario con escala de objeto minúscula) el peso local le daba el
            # 98% del área total y se llevaba el 98% de las partículas: de ahí el
            # grumo denso + nube difusa del T22.
            areas.append((v[1] - v[0]).cross(v[2] - v[0]).length * 0.5)
        bm.free(); o.evaluated_get(dep).to_mesh_clear()
    if components:
        return np.array(tris, dtype=np.float32), np.array(areas, dtype=np.float64), np.array(tri_colors, dtype=np.uint8), np.array(groups), np.array(tri_anim, dtype=np.uint8)
    if colors is not None:
        return np.array(tris, dtype=np.float32), np.array(areas, dtype=np.float64), np.array(tri_colors, dtype=np.uint8)
    return np.array(tris, dtype=np.float32), np.array(areas, dtype=np.float64)

def sharp_edges(tris, max_dim, angle_deg=28.0, per_edge=6):
    """Aristas VIVAS del modelo: las que comparten dos caras con normales que
    difieren más de `angle_deg`, más los bordes abiertos (una sola cara).

    Devuelve `(puntos, caras_tocadas)`:
      - `puntos` (N,3): muestras repartidas a lo largo de esas aristas;
      - `caras_tocadas` (bool por triángulo): qué triángulos las tocan.

    De acá salen las dos mitades de lo que pidió el dueño del proyecto: las
    caras tocadas reciben MÁS partículas (quedan más juntas) y la distancia a
    estos puntos decide el TAMAÑO de cada una (chicas en el borde).

    Los vértices se sueldan redondeando a 1e-4 del tamaño del modelo: en una
    sopa de triángulos el mismo vértice llega repetido por cada cara.
    """
    n_tris = len(tris)
    if n_tris == 0:
        return np.zeros((0, 3), dtype=np.float32), np.zeros(0, dtype=bool)
    q = np.round(tris / (max_dim * 1e-4)).astype(np.int64)
    nrm = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])
    nrm /= (np.linalg.norm(nrm, axis=1)[:, None] + 1e-12)

    edges = {}
    for t in range(n_tris):
        for a, b in ((0, 1), (1, 2), (2, 0)):
            ka, kb = tuple(q[t, a]), tuple(q[t, b])
            key = (ka, kb) if ka <= kb else (kb, ka)
            edges.setdefault(key, []).append((t, a, b))

    cos_lim = math.cos(math.radians(angle_deg))
    touched = np.zeros(n_tris, dtype=bool)
    segs = []
    for uses in edges.values():
        if len(uses) == 1:
            sharp = True
        else:
            sharp = float(np.dot(nrm[uses[0][0]], nrm[uses[1][0]])) < cos_lim
        if not sharp:
            continue
        for t, _, _ in uses:
            touched[t] = True
        t, a, b = uses[0]
        segs.append((tris[t, a], tris[t, b]))

    if not segs:
        return np.zeros((0, 3), dtype=np.float32), touched
    A = np.array([x for x, _ in segs], dtype=np.float32)
    B = np.array([y for _, y in segs], dtype=np.float32)
    ts = np.linspace(0.0, 1.0, per_edge, dtype=np.float32)[None, :, None]
    pts = (A[:, None, :] * (1 - ts) + B[:, None, :] * ts).reshape(-1, 3)
    return pts.astype(np.float32), touched


def local_thickness(tris, points, tri_idx, max_dim):
    """Grosor del sólido bajo cada punto: se tira un rayo hacia adentro (-normal)
    y se mide hasta dónde llega.

    Es lo que distingue una pieza CHICA de una pieza GRANDE, y por lo tanto lo
    que decide cuánto detalle hace falta ahí. La distancia a una arista viva no
    alcanza: los chorros de agua de `riego.glb` son esferas lisas, sin una sola
    arista, así que por esa métrica quedaban "lejos de todo borde" y se llevaban
    las partículas MÁS grandes del modelo -- justo al revés de lo que hace falta
    para que la forma se distinga.

    Sin intersección (superficie abierta, una hoja de un solo lado) devuelve el
    tamaño del modelo: nada que achicar por ese lado.
    """
    from mathutils.bvhtree import BVHTree
    verts = [tuple(v) for v in tris.reshape(-1, 3)]
    polys = [(3 * i, 3 * i + 1, 3 * i + 2) for i in range(len(tris))]
    bvh = BVHTree.FromPolygons(verts, polys, all_triangles=True)

    n = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])
    n /= (np.linalg.norm(n, axis=1)[:, None] + 1e-12)
    eps = max_dim * 1e-4
    out = np.full(len(points), max_dim, dtype=np.float32)
    for i in range(len(points)):
        d = -n[tri_idx[i]]
        o = points[i] + d * eps
        hit = bvh.ray_cast(Vector(o.tolist()), Vector(d.tolist()), max_dim)
        if hit[0] is not None:
            out[i] = hit[3] + eps
    return out


def edge_distance(points, edge_pts, radius):
    """Distancia de cada punto a la arista viva más cercana, saturada en `radius`.

    Hash espacial con celda = `radius`: evita el producto N x M (16 384 x ~40 000
    sería medio minuto por forma) sin depender de scipy, que Blender no trae.
    Saturar en el radio es deseable: más allá, "lejos es lejos".
    """
    out = np.full(len(points), radius, dtype=np.float32)
    if len(edge_pts) == 0 or len(points) == 0:
        return out
    keys = np.floor(edge_pts / radius).astype(np.int64)
    grid = {}
    for i, k in enumerate(map(tuple, keys)):
        grid.setdefault(k, []).append(i)
    pk = np.floor(points / radius).astype(np.int64)
    r2 = radius * radius
    for i in range(len(points)):
        best = r2
        cx, cy, cz = pk[i]
        p = points[i]
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    bucket = grid.get((cx + dx, cy + dy, cz + dz))
                    if not bucket:
                        continue
                    d = edge_pts[bucket] - p
                    m = float((d * d).sum(axis=1).min())
                    if m < best:
                        best = m
        out[i] = math.sqrt(best)
    return out


def sample_surface(tris, areas, count, rng, shell, return_idx=False):
    """Muestreo uniforme por área + cáscara hacia adentro (a lo largo de -normal).
    Con `return_idx` devuelve además el índice de triángulo de cada muestra
    (para heredar atributos por cara, p. ej. el color del material)."""
    p = areas / areas.sum()
    idx = rng.choice(len(tris), size=count, p=p)
    r1 = np.sqrt(rng.random(count)); r2 = rng.random(count)
    a, b, c = tris[idx, 0], tris[idx, 1], tris[idx, 2]
    pts = (1 - r1)[:, None] * a + (r1 * (1 - r2))[:, None] * b + (r1 * r2)[:, None] * c
    if shell > 0:
        n = np.cross(b - a, c - a); n /= (np.linalg.norm(n, axis=1)[:, None] + 1e-9)
        pts -= n * (rng.random(count) * shell)[:, None]
    if return_idx:
        return pts.astype(np.float32), idx
    return pts.astype(np.float32)

# Convención de espacio: el importador glTF de Blender convierte Y-up -> Z-up
# (glTF (x,y,z) -> Blender (x, -z, y)). Por eso, en espacio Blender, el "arriba"
# del asset es +Z y el "frente" del asset (glTF +Z, hacia la cámara) es -Y.
FLATTEN_UP = np.array([0.0, 0.0, 1.0])
FLATTEN_FRONT = np.array([0.0, -1.0, 0.0])

def blender_to_yup(pts):
    """Deshace la conversión Y-up -> Z-up del importador glTF de Blender.

    El muestreo ocurre en espacio Blender (Z arriba), pero la nube se dibuja en
    three.js, que es Y-up: sin esta vuelta el eje "alto" del asset queda en la
    profundidad de la escena y la Central se ve acostada en su caja (bug visto
    en el QA del T24; el logo no lo sufría porque `flatten_to_plane` ya deriva
    sus ejes del "arriba" del asset). Inversa exacta de glTF (x,y,z) ->
    Blender (x, -z, y):  Blender (x,y,z) -> glTF (x, z, -y).
    """
    return np.stack([pts[:, 0], pts[:, 2], -pts[:, 1]], axis=1).astype(np.float32)

def flatten_to_plane(pts, up=FLATTEN_UP, front=FLATTEN_FRONT):
    """Proyecta al plano de mejor ajuste (PCA) y deja z=0.

    El eje 2D se deriva del "arriba" real del asset, NO del orden de varianza
    del SVD: tomar vt[0]/vt[1] mapeaba el eje LARGO de la forma a X, girando el
    logo 90 grados dentro de la pantalla (bug visto en T22). Ahora:
      n (normal) = vt[2] (menor varianza), con signo fijado por `front`;
      v (-> Y)   = `up` proyectado al plano;
      u (-> X)   = v x n, de modo que (u, v, n) queda diestra y el resultado se
                   lee sin espejar desde el frente.
    Determinista y estable: no depende de cuál eje tenga más varianza.
    """
    c = pts.mean(axis=0); q = pts - c
    _, _, vt = np.linalg.svd(q, full_matrices=False)
    n = vt[2].astype(np.float64)
    if np.dot(n, front) < 0: n = -n
    v = up - n * np.dot(n, up)
    if np.linalg.norm(v) < 1e-6:                 # plano perpendicular a `up`: cae al eje mayor
        v = vt[0] - n * np.dot(n, vt[0])
    v /= np.linalg.norm(v)
    u = np.cross(v, n); u /= np.linalg.norm(u)
    return np.stack([q @ u, q @ v, np.zeros(len(q), dtype=np.float32)], axis=1).astype(np.float32)

def normalize(pts):
    mn, mx = pts.min(axis=0), pts.max(axis=0)
    center = (mn + mx) / 2; ext = (mx - mn).max() / 2
    return ((pts - center) / max(ext, 1e-6)).astype(np.float32), mn.tolist(), mx.tolist()

def _name_seed(name):
    """crc32(name) % 1000 — determinista entre procesos (hash() de Python está salteado por proceso)."""
    return zlib.crc32(name.encode('utf-8')) % 1000

def build_shape(name, spec, cfg, lod, size, order=None, write=True):
    """Hornea una forma. Devuelve la permutación de Hilbert que le aplicó.

    `order`: permutación ya calculada por otra forma (su base de `pairWith`).
    Se aplica tal cual en vez de calcular una propia -- ver `main()`.
    `write`: False para construir una forma solo por su `order`, sin tocar disco.
    """
    bpy.ops.wm.read_factory_settings(use_empty=True)
    count = size * size
    # Una forma con `pairWith` siembra su RNG con el nombre de su base: mismo
    # RNG => mismos triángulos y mismas baricéntricas => el índice i de las dos
    # formas es la MISMA partícula. Eso es lo que hace que el morph par sea
    # rígido por pieza en vez de una reasignacion global.
    rng = np.random.RandomState(cfg['seed'] + _name_seed(spec.get('pairWith', name)))
    all_tris = []; all_areas = []; all_colors = []; all_groups = []; all_anim = []; group_offset = 0; first_max = None
    colors = spec.get('colors')  # material name -> hex; solo el logo lo usa hoy
    for src in spec['sources']:
        objs = import_glb(src['file'], src.get('exclude'))
        mn, mx = object_bounds(objs)
        max_dim = max(mx - mn)
        if first_max is None: first_max = max_dim
        s = src.get('scale', 1.0) * (first_max / max_dim) if 'scale' in src else 1.0
        yaw = src.get('yaw', 0.0); off = Vector(src.get('offset', [0, 0, 0])) * first_max
        # `pitch` (giro sobre X, en espacio Blender) endereza las piezas que el
        # modelador dejo acostadas en el plano XY: sin el, `microchip.glb` -- una
        # placa plana de 5.89 x 5.89 x 0.88 -- se ve casi de canto bajo la pose
        # `tresCuartos` (Euler 0.25, 0.5, 0), que solo la inclina 14 grados.
        # pitch = pi/2 deja su cara mirando a -Y de Blender, o sea hacia la camara.
        pitch = src.get('pitch', 0.0)
        center = (mn + mx) / 2
        for o in objs:
            o.matrix_world = (Matrix.Translation(off + center) @ Matrix.Rotation(yaw, 4, 'Z')
                              @ Matrix.Rotation(pitch, 4, 'X') @ Matrix.Scale(s, 4)
                              @ Matrix.Translation(-center) @ o.matrix_world)
        explode = spec.get('explode')
        if explode:
            names = {o.name.split('.')[0] for o in objs}
            missing = [k for k in explode if k not in names]
            if missing:
                print('ERROR explode: mallas sin match', missing, 'disponibles', sorted(names)); sys.exit(2)
        tris, areas, tcol, groups, tanim = triangles_world(objs, explode, first_max, colors, components=True, animate=spec.get('animate'))
        all_groups.append(groups + group_offset); all_anim.append(tanim)
        group_offset += len(objs)
        if colors is not None:
            all_colors.append(tcol)
        all_tris.append(tris); all_areas.append(areas)
    tris = np.concatenate(all_tris); areas = np.concatenate(all_areas)
    if spec.get('animate') and not np.concatenate(all_anim).any():
        print('ERROR animate: ningún material coincide con', spec['animate']); sys.exit(2)
    # Aristas vivas sobre la MISMA sopa de triángulos que se muestrea, así el
    # sesgo de densidad y el tamaño por partícula miran la geometría real.
    edge_pts, edge_tris = sharp_edges(tris, first_max, cfg.get('sharpAngle', 28.0))
    boost = spec.get('edgeBoost', cfg.get('edgeBoost', 1.8))
    weights = areas * (1.0 + boost * edge_tris) if boost > 0 else areas
    # Quantize area weights to keep rigid exploded pairs numerically identical.
    # BUG corregido 2026-09-14: esta línea pisaba `weights` con `areas` puras,
    # descartando el sesgo de `boost` calculado arriba -- con `edgeBoost: 0` en
    # la config global es inobservable (ambas fórmulas coinciden), pero dejaba
    # el sesgo hacia aristas vivas muerto en el código: subir `edgeBoost` en
    # `shapes.json` no habría cambiado nada. Se cuantiza el resultado CON
    # boost, no las áreas crudas.
    weights = np.round(weights / weights.sum(), 8)
    pts, tri_idx = lattice_surface(tris, weights, count)
    normals = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])
    normals /= np.maximum(np.linalg.norm(normals, axis=1)[:, None], 1e-12)
    sample_normals = blender_to_yup(normals[tri_idx])
    sample_groups = np.concatenate(all_groups)[tri_idx]
    sample_anim = np.concatenate(all_anim)[tri_idx]
    sample_rgb = np.concatenate(all_colors)[tri_idx] if colors is not None else None
    # TAMAÑO DEL DETALLE bajo cada partícula, en [0,1]: 0 = detalle fino (pegada a
    # una arista viva, o sobre una pieza delgada), 1 = zona ancha y gruesa. Es lo
    # que decide el tamaño de la partícula en el shader, y por lo tanto lo que
    # hace que el modelo se distinga: donde hay detalle, grano fino.
    #
    # Son DOS medidas y manda la menor. Con sólo la distancia a arista, las
    # piezas lisas sin aristas -- los 108 chorros de agua de riego.glb son
    # esferas -- quedaban "lejos de todo borde" y se llevaban las partículas más
    # grandes del modelo. Con sólo el grosor, una placa grande y fina tendría
    # grano fino en toda su extensión aunque no haga falta.
    radius = first_max * cfg.get('edgeFalloff', 0.09)
    d_edge = edge_distance(pts, edge_pts, radius)
    thick = local_thickness(tris, pts, tri_idx, first_max)
    feature = np.minimum(d_edge, 0.5 * thick)
    # Normalización por PERCENTILES de la propia forma y no por una fracción fija
    # del modelo: cada forma usa así todo el rango de tamaños. Con un divisor
    # fijo, una forma compuesta (la fila de Capacidades mide 10.9 de ancho pero
    # sus piezas 2) quedaba entera del lado chico de la curva.
    lo, hi = np.percentile(feature, [8.0, 92.0])
    edge_k = np.clip((feature - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
    edge_k = edge_k * edge_k * (3 - 2 * edge_k)
    print('   aristas vivas:', len(edge_pts), 'puntos |', int(edge_tris.sum()), 'de', len(tris),
          'triángulos tocados')
    print('   detalle: grosor mediano', round(float(np.median(thick) / first_max), 4), 'del modelo |',
          'p8/p92', round(float(lo), 4), '/', round(float(hi), 4), '| k medio', round(float(edge_k.mean()), 3))
    # `flatten_to_plane` ya emite (u, v, 0) en espacio de pantalla; el resto de
    # las formas sale en espacio Blender y hay que devolverlas a Y-up.
    pts = flatten_to_plane(pts) if spec.get('flatten') else blender_to_yup(pts)
    pts, mn, mx = normalize(pts)
    # Orden de Hilbert: identidad de partícula por localidad espacial (§6). Para
    # un par (`nodo` / `nodo-explotado`) se calcula UNA sola vez, sobre los puntos
    # de la forma BASE, y se aplica la MISMA permutación a las dos. Las dos
    # comparten índices de muestreo, así que permutarlas igual conserva el
    # pareo — y, a diferencia de la versión anterior, ninguna de las dos se
    # queda sin Hilbert: antes `nodo` salía en orden de muestreo crudo y su
    # mediana de distancia entre índices consecutivos era ~0.72 (vecinos al azar
    # en toda la caja), lo que arruina el stagger por seed y el scissor.
    if order is None:
        order = hilbert_order(pts, bits=6 if size <= 128 else 8)
    pts = pts[order]
    sample_normals = sample_normals[order]
    sample_groups = sample_groups[order]
    sample_anim = sample_anim[order]
    edge_k = edge_k[order]
    if sample_rgb is not None:
        sample_rgb = sample_rgb[order]
    if not write:
        return order
    sd = seeds(count, cfg['seed'])
    # Canal w: semilla en [0, .5) más la marca `animate` en el bit alto (w >= .5).
    # El shader lee `seed = fract(w * 2)` y `flag = step(.5, w)`; con half float la
    # semilla conserva ~10 bits, de sobra para el jitter.
    data = np.empty((count, 4), dtype=np.float32); data[:, :3] = pts; data[:, 3] = sd * 0.5 + sample_anim.astype(np.float32) * 0.5
    out_dir = os.path.join(ROOT, cfg['outDir']); os.makedirs(out_dir, exist_ok=True)
    base = os.path.join(out_dir, f'{name}-positions-{lod}')
    data.astype(np.float16).tofile(base + '.bin')
    meta = {'shape': name, 'lod': lod, 'size': size, 'count': count, 'bbox': {'min': mn, 'max': mx},
            'sources': [s['file'] for s in spec['sources']], 'generatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    # Textura de parámetros por partícula (RGBA8, mismo índice de píxel que las
    # posiciones): RGB = color horneado, A = `edgeK`. Van juntas en una sola
    # textura porque TODA forma necesita el tamaño, y sólo algunas el color: dos
    # texturas separadas serían una descarga más por forma para nada.
    rgba = np.full((count, 4), 255, dtype=np.uint8)
    if sample_rgb is not None:
        rgba[:, :3] = sample_rgb
    rgba[:, 3] = np.clip(edge_k * 255.0 + 0.5, 0, 255).astype(np.uint8)
    rgba.tofile(os.path.join(out_dir, f'{name}-params-{lod}.bin'))
    meta['params'] = f'{name}-params-{lod}.bin'
    meta['hasColor'] = sample_rgb is not None
    meta['animated'] = bool(sample_anim.any())
    links = surface_links(pts, sample_normals, sample_groups, 0.065 if lod == 'lod2' else 0.10)
    links.astype('<u4').tofile(os.path.join(out_dir, f'{name}-links-{lod}.bin'))
    meta['links'] = f'{name}-links-{lod}.bin'
    meta['linkCount'] = len(links)
    meta['structure'] = 'surface-lattice-v1' 
    with open(base + '.json', 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)
    print('BAKED', name, lod, count, os.path.getsize(base + '.bin'))
    return order

def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    cfg = json.load(open(CFG_PATH, encoding='utf-8'))
    only_shape = argv[argv.index('--shape') + 1] if '--shape' in argv else None
    only_lod = argv[argv.index('--lod') + 1] if '--lod' in argv else None
    # forma-con-pareja -> su forma base. La base se hornea primero y su
    # permutación de Hilbert se le pasa a la pareja, que comparte índices de
    # muestreo: así las dos quedan ordenadas por Hilbert Y siguen pareadas.
    pairs = {n: sp['pairWith'] for n, sp in cfg['shapes'].items() if 'pairWith' in sp}
    for lod, size in cfg['lods'].items():
        if only_lod and lod != only_lod: continue
        wanted = [n for n in cfg['shapes'] if not only_shape or n == only_shape]
        # Pedir solo la pareja obliga a construir su base para sacarle el orden
        # (sin escribirla, si no fue pedida): el orden no se puede leer del .bin.
        need_order = {pairs[n] for n in wanted if n in pairs}
        orders = {}
        for name in cfg['shapes']:
            if name in pairs: continue
            if name not in wanted and name not in need_order: continue
            orders[name] = build_shape(name, cfg['shapes'][name], cfg, lod, size, write=name in wanted)
        for name in wanted:
            if name not in pairs: continue
            build_shape(name, cfg['shapes'][name], cfg, lod, size, order=orders[pairs[name]])

if __name__ == '__main__' and bpy.app.background:
    main()
