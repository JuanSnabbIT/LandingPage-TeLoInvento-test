import bpy, os, sys
from mathutils import Vector
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
bpy.ops.wm.read_factory_settings(use_empty=True)
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'public/models/hero-central/central-v2.glb'))
imported = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
# La carcasa se dibuja en la web con un gris mate (HeroCentral.tsx, CASING_MATERIAL);
# el poster de respaldo tiene que verse igual, así que se reemplaza el material
# texturizado casi negro del GLB por el mismo gris.
for m in bpy.data.materials:
    if m.name.startswith('Mat_Casing') and m.use_nodes:
        bsdf = m.node_tree.nodes.get('Principled BSDF')
        if bsdf:
            for l in list(bsdf.inputs['Base Color'].links):
                m.node_tree.links.remove(l)
            bsdf.inputs['Base Color'].default_value = (0.253, 0.278, 0.318, 1.0)  # #8a9099 lineal aprox.
            bsdf.inputs['Roughness'].default_value = 0.62
            bsdf.inputs['Metallic'].default_value = 0.12
sc = bpy.context.scene
cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); sc.collection.objects.link(cam)
# Aim the camera at the model's world bounding-box center so it's reliably
# centered in frame, keeping the original three-quarter elevated view
# direction/distance as a starting point.
mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
for o in imported:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
center = (mn + mx) / 2
direction = Vector((0.32, -0.55, 0.28))
cam.location = center + direction
cam.rotation_euler = (-direction).to_track_quat('-Z', 'Y').to_euler()
sc.camera = cam
key = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'AREA')); key.data.energy = 220; key.location = (0.4, -0.4, 0.6); sc.collection.objects.link(key)
rim = bpy.data.objects.new('Rim', bpy.data.lights.new('Rim', 'AREA')); rim.data.energy = 60; rim.data.color = (0.5, 0.61, 0.91); rim.location = (-0.5, 0.3, 0.4); sc.collection.objects.link(rim)
# Luz ambiente neutra: sin mundo iluminado la carcasa gris salía casi negra
# aunque el material ya fuera gris (solo la tocaba el key light lateral).
world = bpy.data.worlds.new('PosterWorld') if not sc.world else sc.world
sc.world = world; world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
if bg:
    bg.inputs['Color'].default_value = (0.62, 0.64, 0.68, 1.0)
    bg.inputs['Strength'].default_value = 0.9
sc.render.engine = 'BLENDER_EEVEE'; sc.render.film_transparent = True
sc.render.resolution_x = 1200; sc.render.resolution_y = 900
sc.render.image_settings.file_format = 'WEBP'; sc.render.image_settings.quality = 85
os.makedirs(os.path.join(ROOT, 'public/posters'), exist_ok=True)
sc.render.filepath = os.path.join(ROOT, 'public/posters/central-v2.webp')
bpy.ops.render.render(write_still=True); print('POSTER', sc.render.filepath)
