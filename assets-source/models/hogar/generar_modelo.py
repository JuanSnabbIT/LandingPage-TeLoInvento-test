# -*- coding: utf-8 -*-
"""Genera assets-source/models/hogar/hogar.glb: el ícono de casa extruido.

Copia la imagen de referencia del dueño del proyecto (2026-09-14): el ícono
plano "home" de un solo color -- techo a dos aguas con aleros en punta, paredes
más angostas que el techo, chimenea a la derecha y la puerta como un hueco
recortado abajo al centro, abierto hasta el piso. Sin ventanas ni otros
detalles. Mismo tratamiento que wifi.glb: la silueta del ícono con grosor y
bordes suaves, una sola pieza y un solo material (`Casa`).

(Antes fue una casa ilustrada con techo rojo, ventana y pomo; el dueño la
rechazó y mandó la referencia.)

Placeholder procedural, no diseño de producto: se reemplaza el .glb con el
mismo nombre cuando exista el modelo real, sin tocar código.

Convención de ejes (la del resto del proyecto): Blender Z arriba, el FRENTE
mira a -Y (glTF +Z, hacia la cámara). La silueta se dibuja en el plano XZ y se
extruye en Y.

Ejecutar:
  "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" -b --python assets-source/models/hogar/generar_modelo.py
"""
import bpy, os, bmesh
from mathutils import Vector

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)

# Silueta medida sobre la referencia (ícono de 200 px; x centrada en la cumbrera,
# z desde la base). Antihoraria vista de frente. Unidad: px de la referencia.
S = 1 / 50.0
SLOPE = (119 - 62) / 44.0          # caída del faldón por px, de la cumbrera al alero


def roof_z(x):
    return 119 - SLOPE * abs(x)


OUTLINE = [
    (-32, 0), (-9, 0), (-9, 34), (9, 34), (9, 0), (32, 0),   # paredes con el hueco de la puerta
    (32, 58), (44, 58), (46, 62),                             # alero derecho
    (25, roof_z(25)), (25, 110), (13, 110), (13, roof_z(13)),  # chimenea
    (0, 119),                                                  # cumbrera
    (-46, 62), (-44, 58), (-32, 58),                           # alero izquierdo
]
DEPTH = 18                          # grosor de la extrusión (px), ~20 % del ancho como wifi.glb
ROUND = 3.2                         # radio de los bordes (px)

me = bpy.data.meshes.new('Casa')
o = bpy.data.objects.new('Casa', me)
bpy.context.collection.objects.link(o)
bm = bmesh.new()
verts = [bm.verts.new((x * S, -DEPTH * S / 2, z * S)) for x, z in OUTLINE]
face = bm.faces.new(verts)
ext = bmesh.ops.extrude_face_region(bm, geom=[face])
moved = [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]
bmesh.ops.translate(bm, vec=(0, DEPTH * S, 0), verts=moved)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(me)
bm.free()

m = bpy.data.materials.new('Casa'); m.use_nodes = True
o.data.materials.append(m)

bpy.ops.object.select_all(action='DESELECT')
o.select_set(True); bpy.context.view_layer.objects.active = o
# Las caras de frente y de atrás son un n-gono cóncavo: triangular antes de
# biselar evita que el bisel las rompa; el bisel redondea TODAS las aristas
# (esquinas de la silueta y el canto de la extrusión) -- es lo que da el
# aspecto de ícono inflado.
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.quads_convert_to_tris()
bpy.ops.object.mode_set(mode='OBJECT')
bev = o.modifiers.new('Suave', 'BEVEL')
bev.width = ROUND * S
bev.segments = 5
bev.limit_method = 'ANGLE'
bev.angle_limit = 0.5
bpy.ops.object.modifier_apply(modifier=bev.name)

mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
for c in o.bound_box:
    w = o.matrix_world @ Vector(c)
    mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
print('Casa caras', len(o.data.polygons), 'min', [round(v, 3) for v in mn], 'max', [round(v, 3) for v in mx])

out_path = os.path.join(OUT_DIR, 'hogar.glb')
bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', use_selection=True)
print('EXPORTADO', out_path, os.path.getsize(out_path), 'bytes')
