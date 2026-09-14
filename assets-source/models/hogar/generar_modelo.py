# -*- coding: utf-8 -*-
"""Genera assets-source/models/hogar/hogar.glb: una casa simple y reconocible
(paredes, techo a dos aguas, puerta, dos ventanas, chimenea) con una antena de
señal en el techo -- el mismo lenguaje visual que la antena de nodo.glb, para
que se lea como "hogar inteligente" sin depender de texto.

Cada pieza es un material propio (Casa_Muro, Casa_Techo, Casa_Puerta,
Casa_Ventana, Casa_Chimenea, Casa_Antena, Casa_Senal) para poder colorearla
por separado en shapes.json, igual que el resto de las formas del proyecto.

Placeholder procedural, no diseño de producto -- mismo criterio que
assets-source/models/capacidades/generar_modelos.py: reemplazar el .glb con
el mismo nombre cuando exista el modelo real, sin tocar código.

Ejecutar:
  "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" -b --python assets-source/models/hogar/generar_modelo.py
"""
import bpy, os, math, bmesh
from mathutils import Vector

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT_DIR, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    return m


def obj(mesh_op, name, material, scale=None, **kwargs):
    """Crea una primitiva, la nombra, le asigna material, y APLICA la escala
    ANTES del transform_apply -- si se escala DESPUÉS de aplicar el transform,
    el origen del objeto ya quedó en el origen del mundo (no en el centro de
    la pieza) y escalar multiplica también su posición, no sólo su tamaño.
    Ese fue exactamente el bug de la primera pasada de este script: puerta y
    ventanas aparecían encogidas Y arrastradas hacia el centro de la casa.
    """
    mesh_op(**kwargs)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat(material))
    if scale is not None:
        o.scale = scale
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o


def prism_roof(name, material, width, depth, height, ridge_offset, location):
    """Prisma a dos aguas construido vértice a vértice (no por colapso de un
    cubo -- colapsar caras de un cubo con bmesh deja vértices duplicados en el
    mismo punto y genera caras degeneradas, visto en la primera pasada de este
    script). `ridge_offset` desplaza la cumbrera sobre X para dar un alero más
    largo de un lado si hiciera falta; 0 = simétrico.
    """
    me = bpy.data.meshes.new(name)
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    bm = bmesh.new()
    hw, hd = width / 2, depth / 2
    v = [
        bm.verts.new((-hw, -hd, 0)), bm.verts.new((hw, -hd, 0)),
        bm.verts.new((hw, hd, 0)), bm.verts.new((-hw, hd, 0)),
        bm.verts.new((ridge_offset, -hd, height)), bm.verts.new((ridge_offset, hd, height)),
    ]
    bm.faces.new((v[0], v[1], v[2], v[3]))       # base (no visible, apoyada)
    bm.faces.new((v[1], v[0], v[4]))              # frontal
    bm.faces.new((v[2], v[1], v[4], v[5]))        # faldón derecho
    bm.faces.new((v[3], v[2], v[5]))              # trasera
    bm.faces.new((v[0], v[3], v[5], v[4]))        # faldón izquierdo
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o.data.materials.append(mat(material))
    o.location = location
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o


# ---------------------------------------------------------------- paredes
walls = obj(bpy.ops.mesh.primitive_cube_add, 'Casa_Muro', 'Casa_Muro',
            scale=(1.3, 1.0, 1.0), size=1.0, location=(0, 0, 0.5))

# ---------------------------------------------------------------- techo
# Cumbrera corre en Y; el ancho (X) y el alero sobresalen un poco de los
# muros (1.3 -> 1.5) para que se lea como un techo apoyado, no una tapa.
roof = prism_roof('Casa_Techo', 'Casa_Techo', width=1.5, depth=1.15, height=0.55,
                   ridge_offset=0, location=(0, 0, 1.0))

# ---------------------------------------------------------------- puerta
# Y=-0.56, grosor 0.12 en Y (de -0.62 a -0.50): sobresale claramente de la
# cara frontal del muro (que llega hasta Y=-0.5) en vez de quedar rasante,
# donde el z-fighting la haría invisible a esta escala.
door = obj(bpy.ops.mesh.primitive_cube_add, 'Casa_Puerta', 'Casa_Puerta',
           scale=(0.24, 0.12, 0.33), size=1.0, location=(0, -0.56, 0.33))

# ---------------------------------------------------------------- ventanas
for side, x in [('Izq', -0.62), ('Der', 0.62)]:
    obj(bpy.ops.mesh.primitive_cube_add, f'Casa_Ventana_{side}', 'Casa_Ventana',
        scale=(0.16, 0.12, 0.16), size=1.0, location=(x, -0.56, 0.62))

# ---------------------------------------------------------------- chimenea
chim = obj(bpy.ops.mesh.primitive_cube_add, 'Casa_Chimenea', 'Casa_Chimenea',
           scale=(0.09, 0.09, 0.32), size=1.0, location=(0.85, 0.15, 1.4))

# ---------------------------------------------------------------- antena + señal
mast = obj(bpy.ops.mesh.primitive_cylinder_add, 'Casa_Antena', 'Casa_Antena',
           radius=0.025, depth=0.55, location=(0, 0, 1.55), vertices=10)

for i, (radius, z, thickness) in enumerate([(0.10, 1.78, 0.014), (0.16, 1.85, 0.013), (0.22, 1.92, 0.012)]):
    bpy.ops.mesh.primitive_torus_add(
        location=(0, 0, z), major_radius=radius, minor_radius=thickness,
        major_segments=16, minor_segments=6,
    )
    ring = bpy.context.active_object
    ring.name = f'Casa_Senal_{i}'
    ring.rotation_euler = (math.radians(90), 0, 0)
    ring.data.materials.append(mat('Casa_Senal'))
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# ---------------------------------------------------------------- verificación
print('--- bbox por pieza ---')
for o in sorted(bpy.data.objects, key=lambda o: o.name):
    mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
    print(' ', o.name, 'min', [round(v, 3) for v in mn], 'max', [round(v, 3) for v in mx])

# ---------------------------------------------------------------- export
bpy.ops.object.select_all(action='SELECT')
out_path = os.path.join(OUT_DIR, 'hogar.glb')
bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', use_selection=True)
print('EXPORTADO', out_path, os.path.getsize(out_path), 'bytes')
