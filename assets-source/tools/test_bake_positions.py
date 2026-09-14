import json, os, subprocess, sys, numpy as np
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.dirname(__file__))
import bake_positions as bp  # noqa: E402

def test_hilbert_locality():
    # puntos consecutivos en orden Hilbert están cerca en el espacio
    pts = np.random.RandomState(1).rand(4096, 3).astype(np.float32) * 2 - 1
    order = bp.hilbert_order(pts, bits=6)
    d = np.linalg.norm(np.diff(pts[order], axis=0), axis=1)
    assert np.median(d) < 0.25

def test_same_seed_per_index():
    a = bp.seeds(16, 123); b = bp.seeds(16, 123)
    assert np.array_equal(a, b) and a.dtype == np.float32 and (a >= 0).all() and (a < 1).all()

def test_half_roundtrip():
    x = np.array([0.5, -0.999, 0.123], dtype=np.float32)
    h = x.astype(np.float16)
    assert np.abs(h.astype(np.float32) - x).max() < 1e-3

# ---------- regresiones de T23 ----------

def _bulb_like(long_axis, rng_seed=7):
    """Nube plana asimétrica (ancho 0.9, largo 4.0) en un plano cuya normal es Y.

    Asimétrica a propósito: el extremo "de arriba" es ancho y el de "abajo"
    angosto, así el test puede detectar un volteo de signo (espejado) además de
    una rotación.
    """
    rng = np.random.RandomState(rng_seed)
    t = rng.rand(4000)                       # 0 = extremo angosto, 1 = extremo ancho
    lon = (t * 4.0) - 2.0                    # eje largo, en [-2, 2]
    lat = (rng.rand(4000) * 2 - 1) * (0.05 + 0.4 * t)   # eje corto, se ensancha con t
    pts = np.zeros((4000, 3), dtype=np.float32)
    if long_axis == 'z':
        pts[:, 2] = lon; pts[:, 0] = lat     # plano XZ, largo vertical (caso del logo)
    else:
        pts[:, 0] = lon; pts[:, 2] = lat     # plano XZ, largo horizontal
    return pts.astype(np.float32)

def test_flatten_long_axis_up_goes_to_y():
    """Regresión del bug T22: el eje LARGO vertical terminaba en x.

    `flatten_to_plane` tomaba `u, v = vt[0], vt[1]`, o sea mandaba a x el eje de
    mayor varianza. Con el logo (ampolleta de pie) eso lo dejaba acostado dentro
    de la pantalla del Hero. La regla nueva deriva los ejes del "arriba" del
    asset (FLATTEN_UP = +Z en espacio Blender), no del orden de varianza.
    """
    pts = _bulb_like('z')
    out = bp.flatten_to_plane(pts)
    assert np.allclose(out[:, 2], 0.0), 'la proyección debe dejar z = 0'
    ext = out.max(axis=0) - out.min(axis=0)
    assert ext[1] > ext[0] * 3, f'el eje largo debe quedar en y, ext={ext}'
    # Convención de signo documentada: n = vt[2] con dot(n, FRONT=(0,-1,0)) > 0
    # => n = -Y; v = +Z; u = v x n = Z x (-Y) = +X. Es decir: y = z original
    # (el extremo ancho sigue arriba) y x = x original (sin espejar).
    c = pts.mean(axis=0)
    assert np.corrcoef(out[:, 1], pts[:, 2] - c[2])[0, 1] > 0.999, 'y debe seguir a +Z, no a -Z'
    assert np.corrcoef(out[:, 0], pts[:, 0] - c[0])[0, 1] > 0.999, 'x debe seguir a +X (sin espejar)'
    # Y el extremo ancho queda arriba (y > 0), que es lo que se ve en pantalla.
    top = out[out[:, 1] > 0.5]; bot = out[out[:, 1] < -0.5]
    assert np.ptp(top[:, 0]) > np.ptp(bot[:, 0]) * 2

def test_flatten_follows_asset_up_not_variance():
    """La regla sigue al "arriba" del asset, no al eje de mayor varianza.

    Complemento del test anterior: una forma ANCHA (eje largo en +X, plano XZ)
    debe seguir saliendo ancha -- su eje largo queda en x. Ojo: esto es
    deliberadamente distinto de "el eje largo siempre va a y". Una regla
    "largo -> y" volvería a rotar 90 grados cualquier forma ancha, que es la
    misma clase de bug que se arregló en T23, sólo que con el signo opuesto.
    Lo invariante es: el +Z del asset (su arriba real) siempre sale en y.
    """
    pts = _bulb_like('x')
    out = bp.flatten_to_plane(pts)
    assert np.allclose(out[:, 2], 0.0)
    ext = out.max(axis=0) - out.min(axis=0)
    assert ext[0] > ext[1] * 3, f'una forma ancha debe seguir ancha, ext={ext}'
    c = pts.mean(axis=0)
    assert np.corrcoef(out[:, 1], pts[:, 2] - c[2])[0, 1] > 0.999, '+Z del asset sigue saliendo en y'

def test_face_area_weight_is_world_space():
    """Regresión del bug T22: `triangles_world` pesaba por área LOCAL.

    Reproduce la patología de `nodo.glb`: un cubo de tamaño local unitario pero
    con escala de objeto minúscula (Chassis_ClipTab) junto a una malla grande.
    Con `f.calc_area()` (área local) el cubo se llevaba el 98 % de las muestras;
    con el área en mundo se lleva menos del 5 %.
    """
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # Cubo "unitario" en local (lado 2 -> área local 24) pero encogido x0.01 en
    # el objeto (área en mundo 24e-4) y apartado en +X para poder contarlo.
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(10, 0, 0))
    tiny = bpy.context.active_object
    tiny.scale = (0.01, 0.01, 0.01)

    # Plano grande: lado local 2 escalado x5 -> área en mundo 100.
    bpy.ops.mesh.primitive_plane_add(size=2.0, location=(0, 0, 0))
    big = bpy.context.active_object
    big.scale = (5.0, 5.0, 5.0)
    bpy.context.view_layer.update()

    tris, areas = bp.triangles_world([tiny, big])
    tiny_tris = tris[:, :, 0].mean(axis=1) > 5.0     # los del cubo están en x ~ 10
    world_share = areas[tiny_tris].sum() / areas.sum()
    assert world_share < 0.01, f'área en mundo del cubo diminuto = {world_share:.4%}, debería ser ~0.0024%'

    # Y con el peso viejo (área local) el cubo dominaba: se comprueba para que
    # el test falle si alguien vuelve a `f.calc_area()`.
    assert areas[tiny_tris].sum() < 1e-2, 'el área en mundo del cubo debe ser ~0.0024, no 24'

    pts = bp.sample_surface(tris, areas, 10000, np.random.RandomState(3), shell=0.0)
    share = float((pts[:, 0] > 5.0).mean())
    assert share < 0.05, f'{share:.2%} de las partículas cayeron en el cubo diminuto (máx 5 %)'

# ---------- regresiones de T24 ----------

def test_solid_shapes_come_back_to_gltf_yup():
    """El muestreo pasa por espacio Blender (Z arriba) y la nube se dibuja en
    three.js (Y arriba): sin `blender_to_yup` el alto del asset queda en la
    profundidad de la escena y la Central se ve acostada (bug del QA T24).

    Se verifica contra la convención documentada del importador glTF de Blender,
    glTF (x, y, z) -> Blender (x, -z, y), o sea que la vuelta es su inversa
    exacta y que el "arriba" del asset (+Z en Blender) sale en +Y.
    """
    gltf = np.array([[1.0, 2.0, 3.0], [-0.5, 0.25, -4.0], [0.0, 0.0, 0.0]], dtype=np.float32)
    # lo que hace el importador al traerlo a Blender
    blender = np.stack([gltf[:, 0], -gltf[:, 2], gltf[:, 1]], axis=1).astype(np.float32)
    out = bp.blender_to_yup(blender)
    assert np.allclose(out, gltf), f'no es la inversa del importador: {out} != {gltf}'

    up_blender = np.array([[0.0, 0.0, 1.0]], dtype=np.float32)
    assert np.allclose(bp.blender_to_yup(up_blender), [[0.0, 1.0, 0.0]]), 'el +Z de Blender debe salir en +Y'

    # Y no es un simple swap: tiene que conservar la mano (determinante +1),
    # si no el modelo saldría espejado.
    basis = bp.blender_to_yup(np.eye(3, dtype=np.float32))
    assert np.isclose(np.linalg.det(basis), 1.0), f'la conversión espeja el modelo, det={np.linalg.det(basis)}'

# ---------- regresiones de la revision de rama (I2) ----------

def _read_bake(out_dir, name, lod='mobile'):
    """Devuelve (datos normalizados Nx4, puntos deshechos a espacio de mundo).

    El `.json` guarda el bbox previo a `normalize()`, asi que la normalizacion
    se puede invertir exactamente: eso deja los dos horneados en el MISMO
    espacio y el delta por indice pasa a ser el desplazamiento de `explode`
    puro, en vez de estar contaminado por las dos escalas distintas.
    """
    base = os.path.join(out_dir, f'{name}-positions-{lod}')
    data = np.fromfile(base + '.bin', dtype=np.float16).reshape(-1, 4).astype(np.float32)
    meta = json.load(open(base + '.json', encoding='utf-8'))
    mn = np.array(meta['bbox']['min'], dtype=np.float64)
    mx = np.array(meta['bbox']['max'], dtype=np.float64)
    ext = max((mx - mn).max() / 2, 1e-6)
    world = data[:, :3].astype(np.float64) * ext + (mn + mx) / 2
    return data, world, ext


def test_paired_shapes_share_one_hilbert_order():
    """`nodo` y `nodo-explotado` se ordenan por Hilbert con la MISMA permutacion.

    Antes, para conservar el pareo, las dos se horneaban SIN Hilbert: compartian
    indice pero el orden era el del muestreo crudo, o sea vecinos al azar en toda
    la caja (mediana de distancia entre indices consecutivos ~0.72 en una forma
    normalizada a [-1,1]). Eso rompe justo lo que el orden de Hilbert sostiene:
    el stagger por semilla y el corredor del scissor asumen que indices vecinos
    son particulas vecinas.

    Ahora el orden se calcula una sola vez sobre la forma BASE y se aplica a las
    dos. Se verifica lo que importa de las dos propiedades a la vez:
      (a) el canal de semilla sigue siendo identico indice a indice;
      (b) el delta por indice, en espacio de mundo, son los pocos desplazamientos
          rigidos de `explode` (el morph par sigue siendo pieza-a-pieza);
      (c) la base quedo efectivamente ordenada por Hilbert.
    """
    import shutil, tempfile
    cfg = json.load(open(bp.CFG_PATH, encoding='utf-8'))
    size = cfg['lods']['mobile']                      # 128 -> 16 384 puntos, ~segundos
    out = tempfile.mkdtemp(prefix='bake-pair-')
    cfg = {**cfg, 'outDir': out}                      # nunca escribe en public/
    try:
        order = bp.build_shape('nodo', cfg['shapes']['nodo'], cfg, 'mobile', size)
        bp.build_shape('nodo-explotado', cfg['shapes']['nodo-explotado'], cfg, 'mobile', size, order=order)
        a, a_world, a_ext = _read_bake(out, 'nodo')
        b, b_world, _ = _read_bake(out, 'nodo-explotado')

        # (a) misma particula en el mismo indice
        assert np.array_equal(a[:, 3], b[:, 3]), 'el canal de semilla dejo de coincidir indice a indice'

        # (b) el delta por indice es uno de los pocos offsets rigidos de explode:
        # los 7 de `explode` + el cero de las piezas que no se mueven. El redondeo
        # a 2 decimales parte alguno en dos por el half-float, de ahi que se mida
        # la cobertura de los 8 mas poblados en vez de exigir 8 exactos.
        n_explode = len(cfg['shapes']['nodo-explotado']['explode'])
        deltas = np.round((b_world - a_world) / a_ext, 2)
        uniq, counts = np.unique(deltas, axis=0, return_counts=True)
        top = np.sort(counts)[::-1][:n_explode + 1].sum() / len(deltas)
        print('   deltas distintos:', len(uniq), '- cobertura de los', n_explode + 1, 'mayores:', f'{top:.2%}')
        assert len(uniq) <= 12, f'{len(uniq)} deltas distintos: el pareo por indice se rompio'
        assert top > 0.99, f'solo {top:.2%} de las particulas cae en un offset rigido de explode'

        # (c) y la base quedo ordenada por Hilbert (antes: ~0.72)
        med = float(np.median(np.linalg.norm(np.diff(a[:, :3], axis=0), axis=1)))
        print('   mediana de distancia entre indices consecutivos de nodo:', round(med, 4))
        assert med < 0.1, f'nodo no quedo ordenado por Hilbert: mediana {med:.3f}'
    finally:
        shutil.rmtree(out, ignore_errors=True)


# ---------- modelos del dueno del proyecto (fila de Capacidades) ----------

def test_exclude_drops_the_mesh_before_measuring():
    """`exclude` saca la malla ANTES de medir los limites y de repartir area.

    `riego.glb` trae un disco de tierra (`Suelo_Disco`) que es el 81.7 % de la
    superficie del modelo: sin excluirlo, 4 de cada 5 particulas del aspersor
    caen en el suelo y el resto (mastil, brotes, chorros) queda en un puñado de
    puntos. Ademas el disco es lo mas ancho en Y, asi que tambien deformaba el
    encuadre de la fila.
    """
    src = 'assets-source/models/capacidades/riego.glb'
    todo = bp.import_glb(src)
    nombres = {o.name.split('.')[0] for o in todo}
    assert 'Suelo_Disco' in nombres, 'el modelo cambio: ya no trae Suelo_Disco'
    _, areas_todo = bp.triangles_world(todo)

    sin_suelo = bp.import_glb(src, ['Suelo_Disco'])
    assert 'Suelo_Disco' not in {o.name.split('.')[0] for o in sin_suelo}
    assert len(sin_suelo) == len(todo) - 1
    _, areas_sin = bp.triangles_world(sin_suelo)
    assert areas_sin.sum() < areas_todo.sum() * 0.25, 'el suelo seguia pesando en el area'

    # y los limites se miden sobre lo que queda: el disco era lo ancho en Y
    mn, mx = bp.object_bounds(sin_suelo)
    assert (mx - mn)[1] < 2.0, f'el encuadre sigue incluyendo el disco: {list(mx - mn)}'


def test_roll_tilts_the_top_to_the_right():
    """`roll` negativo (convención three) inclina el "arriba" del asset hacia +X.

    Es la inclinación del logo (`roll: -0.6`): la punta de la ampolleta hacia la
    derecha y la llama abajo a la izquierda, como en la referencia del dueño.
    """
    pts = np.array([[0, 1, 0], [0, -1, 0], [0.3, 0, 0.2]], dtype=np.float32)
    out = bp.roll_yup(pts, -0.6)
    assert out[0, 0] > 0.5 and out[0, 1] > 0.7, f'la punta no fue arriba a la derecha: {out[0]}'
    assert out[1, 0] < -0.5, f'la base no fue abajo a la izquierda: {out[1]}'
    assert np.allclose(np.linalg.norm(out[:, :2], axis=1), np.linalg.norm(pts[:, :2], axis=1), atol=1e-6)
    assert np.allclose(out[:, 2], pts[:, 2]), 'roll no debe tocar la profundidad'


def test_ramp_levels_blink_grows_toward_the_bottom():
    """La llama del logo: quieta cerca de la base, nivel creciente hacia la punta.

    Sólo las partículas de `mask` (materiales `animate`) reciben nivel; el
    resto del modelo queda en 0 aunque esté más abajo.
    """
    z = np.array([1.0, 0.8, 0.5, 0.2, 0.0, -5.0], dtype=np.float32)
    mask = np.array([True, True, True, True, True, False])
    lv = bp.ramp_levels(z, mask, 0.3)
    assert lv.dtype == np.uint8
    assert lv[0] == 0 and lv[1] == 0, f'arriba de `from` debe quedar quieta: {lv}'
    assert list(lv[1:5]) == sorted(lv[1:5]), f'el nivel debe crecer hacia abajo: {lv}'
    assert lv[4] == 4, f'la punta debe llegar a 4: {lv}'
    assert lv[5] == 0, 'fuera de la máscara no se anima'


def test_density_bakes_fewer_distinct_positions_but_full_count():
    """`density` hornea menos posiciones DISTINTAS y apila el resto encima.

    El conteo total no cambia (el morph empareja el índice i entre formas);
    lo que baja es cuántos puntos distintos se ven en reposo.
    """
    import shutil, tempfile
    cfg = json.load(open(bp.CFG_PATH, encoding='utf-8'))
    out = tempfile.mkdtemp(prefix='bake-density-')
    cfg = {**cfg, 'outDir': out}
    try:
        bp.build_shape('denso', {'sources': [{'file': 'assets-source/models/capacidades/microchip.glb'}], 'density': 0.25}, cfg, 'mobile', 32)
        pos = np.fromfile(os.path.join(out, 'denso-positions-mobile.bin'), dtype=np.float16).reshape(-1, 4)
        assert len(pos) == 32 * 32, f'el conteo total debe seguir siendo 1024, dio {len(pos)}'
        distintas = len(np.unique(pos[:, :3], axis=0))
        assert distintas <= 256, f'con density 0.25 deben quedar <= 256 posiciones distintas, dio {distintas}'
        assert distintas > 200, f'demasiadas posiciones colapsadas: {distintas}'
    finally:
        shutil.rmtree(out, ignore_errors=True)


def test_pitch_stands_a_flat_plate_upright():
    """`pitch` endereza una pieza que el modelador dejo acostada en XY.

    `microchip.glb` es una placa de 5.89 x 5.89 x 0.88: acostada, su alto en la
    escena es 0.88 y bajo la pose `tresCuartos` (que solo inclina 14 grados) se
    ve casi de canto. Con pitch = pi/2 su cara queda mirando a la camara.
    """
    import shutil, tempfile
    cfg = json.load(open(bp.CFG_PATH, encoding='utf-8'))
    out = tempfile.mkdtemp(prefix='bake-pitch-')
    cfg = {**cfg, 'outDir': out}
    chip = 'assets-source/models/capacidades/microchip.glb'
    try:
        for nombre, spec in (('acostado', {'sources': [{'file': chip}]}),
                             ('parado', {'sources': [{'file': chip, 'pitch': 1.5708}]})):
            bp.build_shape(nombre, spec, cfg, 'mobile', 32)
        alto = {}
        for nombre in ('acostado', 'parado'):
            meta = json.load(open(os.path.join(out, f'{nombre}-positions-mobile.json'), encoding='utf-8'))
            mn = np.array(meta['bbox']['min']); mx = np.array(meta['bbox']['max'])
            alto[nombre] = (mx - mn)[1] / (mx - mn).max()   # alto relativo al lado mayor
        print('   alto relativo acostado/parado:', {k: round(v, 3) for k, v in alto.items()})
        assert alto['acostado'] < 0.3, f"la placa acostada deberia ser chata, dio {alto['acostado']:.3f}"
        assert alto['parado'] > 0.9, f"pitch no la paro: alto relativo {alto['parado']:.3f}"
    finally:
        shutil.rmtree(out, ignore_errors=True)


if __name__ == '__main__':
    # No cortar en el primer fallo: se corre bajo Blender, una sola vez, y saber
    # cuáles de los siete fallan vale más que abortar.
    failed = 0
    for name, fn in list(globals().items()):
        if not name.startswith('test_'):
            continue
        try:
            fn(); print('PASS', name)
        except AssertionError as e:
            failed += 1; print('FAIL', name, '--', e)
    print(f'--- {failed} failed')
    sys.exit(1 if failed else 0)
