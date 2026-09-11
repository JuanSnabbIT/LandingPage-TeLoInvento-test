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
