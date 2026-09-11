"""Bake de posiciones para la nube (spec 13 §3.6, §6).
uso: blender -b --python assets-source/tools/bake_positions.py -- [--shape nombre] [--lod lod2|mobile]
Sin args: todas las formas, todos los LODs."""
import bpy, bmesh, json, math, os, sys, datetime, zlib
import numpy as np
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
def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, path))
    return [o for o in bpy.data.objects if o not in before and o.type == 'MESH']

def object_bounds(objs):
    mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
    return mn, mx

def triangles_world(objs, explode=None, max_dim=1.0):
    """Lista de (tri 3x3 float32, área) en mundo, aplicando explode por nombre de objeto."""
    tris = []; areas = []
    for o in objs:
        dep = bpy.context.evaluated_depsgraph_get()
        me = o.evaluated_get(dep).to_mesh()
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.triangulate(bm, faces=bm.faces)
        off = Vector((0, 0, 0))
        if explode:
            base = o.name.split('.')[0]
            if base in explode:
                off = Vector(explode[base]) * max_dim
        for f in bm.faces:
            v = [(o.matrix_world @ vv.co) + off for vv in f.verts]
            tris.append([[p.x, p.y, p.z] for p in v])
            # Área EN MUNDO, no `f.calc_area()`: esa es el área en espacio local
            # de la malla e ignora la escala de `o.matrix_world`. Con objetos de
            # escala muy distinta (en nodo.glb, `Chassis_ClipTab` es un cubo
            # unitario con escala de objeto minúscula) el peso local le daba el
            # 98% del área total y se llevaba el 98% de las partículas: de ahí el
            # grumo denso + nube difusa del T22.
            areas.append((v[1] - v[0]).cross(v[2] - v[0]).length * 0.5)
        bm.free(); o.evaluated_get(dep).to_mesh_clear()
    return np.array(tris, dtype=np.float32), np.array(areas, dtype=np.float64)

def sample_surface(tris, areas, count, rng, shell):
    """Muestreo uniforme por área + cáscara hacia adentro (a lo largo de -normal)."""
    p = areas / areas.sum()
    idx = rng.choice(len(tris), size=count, p=p)
    r1 = np.sqrt(rng.random(count)); r2 = rng.random(count)
    a, b, c = tris[idx, 0], tris[idx, 1], tris[idx, 2]
    pts = (1 - r1)[:, None] * a + (r1 * (1 - r2))[:, None] * b + (r1 * r2)[:, None] * c
    if shell > 0:
        n = np.cross(b - a, c - a); n /= (np.linalg.norm(n, axis=1)[:, None] + 1e-9)
        pts -= n * (rng.random(count) * shell)[:, None]
    return pts.astype(np.float32)

# Convención de espacio: el importador glTF de Blender convierte Y-up -> Z-up
# (glTF (x,y,z) -> Blender (x, -z, y)). Por eso, en espacio Blender, el "arriba"
# del asset es +Z y el "frente" del asset (glTF +Z, hacia la cámara) es -Y.
FLATTEN_UP = np.array([0.0, 0.0, 1.0])
FLATTEN_FRONT = np.array([0.0, -1.0, 0.0])

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

def build_shape(name, spec, cfg, lod, size):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    count = size * size
    rng = np.random.RandomState(cfg['seed'] + _name_seed(name) if 'pairWith' not in spec else cfg['seed'] + _name_seed(spec['pairWith']))
    all_tris = []; all_areas = []; first_max = None
    for src in spec['sources']:
        objs = import_glb(src['file'])
        mn, mx = object_bounds(objs)
        max_dim = max(mx - mn)
        if first_max is None: first_max = max_dim
        s = src.get('scale', 1.0) * (first_max / max_dim) if 'scale' in src else 1.0
        yaw = src.get('yaw', 0.0); off = Vector(src.get('offset', [0, 0, 0])) * first_max
        center = (mn + mx) / 2
        for o in objs:
            o.matrix_world = Matrix.Translation(off + center) @ Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Scale(s, 4) @ Matrix.Translation(-center) @ o.matrix_world
        explode = spec.get('explode')
        if explode:
            names = {o.name.split('.')[0] for o in objs}
            missing = [k for k in explode if k not in names]
            if missing:
                print('ERROR explode: mallas sin match', missing, 'disponibles', sorted(names)); sys.exit(2)
        tris, areas = triangles_world(objs, explode, first_max)
        all_tris.append(tris); all_areas.append(areas)
    tris = np.concatenate(all_tris); areas = np.concatenate(all_areas)
    pts = sample_surface(tris, areas, count, rng, spec.get('shell', cfg['shell']))
    if spec.get('flatten'): pts = flatten_to_plane(pts)
    pts, mn, mx = normalize(pts)
    if 'pairWith' not in spec:
        pts = pts[hilbert_order(pts, bits=6 if size <= 128 else 8)]
    # pairWith: mismo rng ⇒ mismos triángulos/barycentrics; el explode ya movió las piezas.
    # Se conserva el orden del muestreo (idéntico al de la forma pareja) SIN reordenar por Hilbert:
    # para que coincida, la forma pareja también se genera sin reorden cuando tiene pares.
    sd = seeds(count, cfg['seed'])
    data = np.empty((count, 4), dtype=np.float32); data[:, :3] = pts; data[:, 3] = sd
    out_dir = os.path.join(ROOT, cfg['outDir']); os.makedirs(out_dir, exist_ok=True)
    base = os.path.join(out_dir, f'{name}-positions-{lod}')
    data.astype(np.float16).tofile(base + '.bin')
    with open(base + '.json', 'w', encoding='utf-8') as f:
        json.dump({'shape': name, 'lod': lod, 'size': size, 'count': count, 'bbox': {'min': mn, 'max': mx},
                   'sources': [s['file'] for s in spec['sources']], 'generatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()}, f, indent=2)
    print('BAKED', name, lod, count, os.path.getsize(base + '.bin'))

def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    cfg = json.load(open(CFG_PATH, encoding='utf-8'))
    only_shape = argv[argv.index('--shape') + 1] if '--shape' in argv else None
    only_lod = argv[argv.index('--lod') + 1] if '--lod' in argv else None
    # Las formas con pareja (pairWith) y sus parejas se generan SIN reorden Hilbert para compartir índice.
    paired = {s.get('pairWith') for s in cfg['shapes'].values() if 'pairWith' in s}
    for lod, size in cfg['lods'].items():
        if only_lod and lod != only_lod: continue
        for name, spec in cfg['shapes'].items():
            if only_shape and name != only_shape: continue
            if name in paired: spec = {**spec, 'pairWith': name}  # marca: sin Hilbert, mismo rng que su pareja
            build_shape(name, spec, cfg, lod, size)

if __name__ == '__main__' and bpy.app.background:
    main()
