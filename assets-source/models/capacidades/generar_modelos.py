"""Modelos procedurales de placeholder para las tarjetas de Capacidades.

Uso (desde la raíz del repo):
  blender -b --python assets-source/models/capacidades/generar_modelos.py -- <nombre>
  nombre: sensor_humedad | valvula_riego | sensor_perimetral | todos

Escribe assets-source/models/capacidades/<nombre>.blend (fuente editable) y
public/models/capacidades/<nombre>.glb (export final, Y-up, sin luces/cámara).
Ver README-modelos-generados.md al lado de este script para qué representa
cada uno y qué debería reemplazarlo cuando exista el diseño real.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
SRC_DIR = os.path.join(ROOT, 'assets-source', 'models', 'capacidades')
OUT_DIR = os.path.join(ROOT, 'public', 'models', 'capacidades')


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, metallic=0.0, roughness=0.5, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if alpha < 1.0:
        bsdf.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND'
    return m


def bevel(obj, width=0.001, segments=3):
    mod = obj.modifiers.new('Bevel', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    bpy.ops.object.shade_smooth_by_angle()


def box(name, size, loc, mat, bevel_w=0.0015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = Vector(size)
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(mat)
    bevel(o, bevel_w)
    return o


def cylinder(name, radius, depth, loc, mat, rot=(0, 0, 0), verts=32, bevel_w=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    if bevel_w:
        bevel(o, bevel_w)
    bpy.ops.object.shade_smooth()
    return o


def sphere(name, radius, loc, mat, half=False):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=loc, segments=32, ring_count=16)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    if half:
        bm = bmesh.new()
        bm.from_mesh(o.data)
        geom = [v for v in bm.verts if v.co.z < -1e-6]
        bmesh.ops.delete(bm, geom=geom, context='VERTS')
        bm.to_mesh(o.data)
        bm.free()
    bpy.ops.object.shade_smooth()
    return o


# ---------------------------------------------------------------- modelos

def sensor_humedad():
    """Sonda de humedad de suelo tipo estaca: cabezal con electrónica + dos
    varillas metálicas hacia abajo + salida de cable. Unidades: metros."""
    plastic = material('Mat_Sensor_Plastic', (0.16, 0.17, 0.19), roughness=0.6)
    steel = material('Mat_Probe_Steel', (0.75, 0.76, 0.78), metallic=1.0, roughness=0.35)
    rubber = material('Mat_Cable_Rubber', (0.05, 0.05, 0.06), roughness=0.9)
    accent = material('Mat_Accent_Blue', (0.17, 0.47, 0.88), roughness=0.4)

    box('Sensor_Head', (0.034, 0.018, 0.052), (0, 0, 0.026), plastic, 0.003)
    box('Sensor_Label', (0.024, 0.0005, 0.018), (0, -0.0093, 0.036), accent, 0.0005)
    cylinder('Probe_Left', 0.0022, 0.11, (-0.009, 0, -0.055), steel)
    cylinder('Probe_Right', 0.0022, 0.11, (0.009, 0, -0.055), steel)
    cylinder('Cable_Gland', 0.005, 0.012, (0, 0, 0.058), rubber)
    # Sale del prensacable (tope en z=0.064) inclinado hacia -Y.
    cylinder('Cable', 0.0028, 0.05, (0, -0.0217, 0.0765), rubber, rot=(math.radians(60), 0, 0))


def valvula_riego():
    """Electroválvula de riego: cuerpo tubular con rosca en ambos extremos,
    bobina solenoide vertical encima con tuerca, y cable. Unidades: metros."""
    body = material('Mat_Valve_Body', (0.12, 0.13, 0.15), roughness=0.55)
    brass = material('Mat_Brass', (0.78, 0.62, 0.3), metallic=1.0, roughness=0.4)
    coil = material('Mat_Coil', (0.09, 0.1, 0.12), roughness=0.5)
    rubber = material('Mat_Cable_Rubber', (0.05, 0.05, 0.06), roughness=0.9)

    cylinder('Valve_Body', 0.017, 0.11, (0, 0, 0), body, rot=(0, math.radians(90), 0), bevel_w=0.002)
    cylinder('Thread_Left', 0.0155, 0.02, (-0.06, 0, 0), brass, rot=(0, math.radians(90), 0))
    cylinder('Thread_Right', 0.0155, 0.02, (0.06, 0, 0), brass, rot=(0, math.radians(90), 0))
    box('Valve_Bonnet', (0.048, 0.04, 0.02), (0, 0, 0.02), body, 0.003)
    cylinder('Solenoid_Coil', 0.014, 0.045, (0, 0, 0.052), coil, bevel_w=0.002)
    cylinder('Solenoid_Nut', 0.0105, 0.008, (0, 0, 0.078), brass, verts=6)
    # Sale del costado superior de la bobina (y=0.013, z=0.07) hacia +Y.
    cylinder('Cable', 0.0025, 0.05, (0, 0.0365, 0.0786), rubber, rot=(math.radians(-70), 0, 0))


def sensor_perimetral():
    """Sensor de presencia/perímetro tipo PIR para montaje en pared: caja
    redondeada, lente domo, LED de estado y soporte articulado. Unidades: metros."""
    white = material('Mat_Housing_White', (0.9, 0.9, 0.88), roughness=0.5)
    lens = material('Mat_Lens', (0.02, 0.02, 0.03), roughness=0.15, alpha=0.9)
    led = material('Mat_LED_Red', (0.95, 0.15, 0.1), roughness=0.3)
    dark = material('Mat_Bracket_Dark', (0.15, 0.15, 0.17), roughness=0.6)

    box('Housing', (0.062, 0.03, 0.09), (0, 0, 0), white, 0.006)
    sphere('Lens_Dome', 0.022, (0, -0.014, 0.008), lens, half=True)
    # La semiesfera queda apuntando a +Z; +90° en X la lleva a -Y (frente de la carcasa).
    bpy.context.active_object.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    cylinder('Status_LED', 0.0025, 0.002, (0, -0.0155, 0.036), led, rot=(math.radians(90), 0, 0))
    cylinder('Bracket_Ball', 0.008, 0.016, (0, 0.02, -0.03), dark, verts=24)
    box('Bracket_Plate', (0.04, 0.004, 0.04), (0, 0.03, -0.03), dark, 0.002)


MODELS = {
    'sensor_humedad': sensor_humedad,
    'valvula_riego': valvula_riego,
    'sensor_perimetral': sensor_perimetral,
}


def build(name):
    reset_scene()
    MODELS[name]()
    os.makedirs(SRC_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    blend_path = os.path.join(SRC_DIR, f'{name}.blend')
    glb_path = os.path.join(OUT_DIR, f'{name}.glb')
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=glb_path, export_format='GLB', use_selection=True, export_apply=True,
        export_yup=True, export_materials='EXPORT', export_animations=False,
    )
    print('GENERADO', name, os.path.getsize(glb_path))


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['todos']
    names = list(MODELS) if args[0] == 'todos' else args
    for n in names:
        build(n)
