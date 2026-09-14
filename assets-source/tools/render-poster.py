"""Póster de respaldo del Hero: el logo (ampolleta) renderizado en Blender.
Lo muestra `.hero__poster` cuando no hay WebGL2 o la escena se degradó
(html.scene-poster). Mismos colores por material que la nube (shapes.json,
forma `logo`), emisivos para que brillen sobre el fondo oscuro de la página.

uso: blender -b --python assets-source/tools/render-poster.py
"""
import bpy, os
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
COLORS = {
    'TLI_Yellow': '#FFC83D', 'TLI_Teal': '#49DDE7', 'TLI_Navy': '#448AB5',
    'TLI_Flame_Core': '#FFE08A', 'TLI_Flame_Outer': '#F5A623',
}


def srgb_to_linear(hex_color):
    c = [int(hex_color[i:i + 2], 16) / 255.0 for i in (1, 3, 5)]
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c) + (1.0,)


bpy.ops.wm.read_factory_settings(use_empty=True)
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets-source/models/hero-central/logo-lod1.glb'))
imported = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']

for m in bpy.data.materials:
    base = m.name.split('.')[0]
    if base not in COLORS or not m.use_nodes:
        continue
    bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf:
        continue
    color = srgb_to_linear(COLORS[base])
    for l in list(bsdf.inputs['Base Color'].links):
        m.node_tree.links.remove(l)
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Emission Color'].default_value = color
    bsdf.inputs['Emission Strength'].default_value = 1.4
    bsdf.inputs['Roughness'].default_value = 0.7

sc = bpy.context.scene
mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
for o in imported:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
center = (mn + mx) / 2
size = max(mx - mn)
# De frente (la nube usa pose `frontal`): la cara del logo mira a -Y en
# Blender, la cámara se para en -Y mirando hacia +Y. Ortográfica, como la
# proyección casi plana con que se lee la nube a esta distancia.
d = Vector((0, 1, 0))
cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); sc.collection.objects.link(cam)
cam.data.type = 'ORTHO'
cam.data.ortho_scale = size * 1.12
cam.location = center - d * size * 3
cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
sc.camera = cam
world = bpy.data.worlds.new('PosterWorld'); sc.world = world; world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
if bg:
    bg.inputs['Color'].default_value = (0.05, 0.06, 0.08, 1.0)
    bg.inputs['Strength'].default_value = 0.6
sc.render.engine = 'BLENDER_EEVEE'; sc.render.film_transparent = True
sc.render.resolution_x = 900; sc.render.resolution_y = 900
sc.render.image_settings.file_format = 'WEBP'; sc.render.image_settings.quality = 85
os.makedirs(os.path.join(ROOT, 'public/posters'), exist_ok=True)
sc.render.filepath = os.path.join(ROOT, 'public/posters/logo.webp')
bpy.ops.render.render(write_still=True); print('POSTER', sc.render.filepath)
