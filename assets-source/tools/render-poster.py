"""Póster de respaldo del Hero: la nube horneada del logo, dibujada punto a punto.
Lo muestra `.hero__poster` cuando no hay WebGL2 o la escena se degradó
(html.scene-poster).

No renderiza el GLB: dibuja las MISMAS partículas que ve la escena
(`logo-positions-lod2.bin` + `logo-params-lod2.bin`), con su color horneado,
su tamaño por detalle y la atenuación hacia atrás del fragment shader. Así el
póster no se desincroniza de la nube cuando cambia algo que sólo existe en el
horneado -- la llama procedural (flame_structure.py) y la inclinación (`roll`)
del 2026-09-14 no están en logo-lod1.glb.

uso (DESPUÉS de hornear el logo):  blender -b --python assets-source/tools/render-poster.py
"""
import bpy, json, os
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SHAPE, LOD, W = 'logo', 'lod2', 900
MARGIN = 0.94          # fracción del lienzo que ocupa el lado mayor de la forma
BACK_ALPHA = 0.35      # mismo piso que cloudTokens.backAlpha

base = os.path.join(ROOT, 'public', 'textures', 'particulas')
meta = json.load(open(os.path.join(base, f'{SHAPE}-positions-{LOD}.json'), encoding='utf-8'))
n = meta['count']
pos = np.fromfile(os.path.join(base, f'{SHAPE}-positions-{LOD}.bin'), dtype=np.float16).reshape(n, 4).astype(np.float32)
par = np.fromfile(os.path.join(base, f'{SHAPE}-params-{LOD}.bin'), dtype=np.uint8).reshape(n, 4)

x, y, z = pos[:, 0], pos[:, 1], pos[:, 2]
px = (x * 0.5 * MARGIN + 0.5) * W
py = (0.5 - y * 0.5 * MARGIN) * W
radius = 1.3 + 1.1 * (par[:, 3] / 255.0)
fade = BACK_ALPHA + (1 - BACK_ALPHA) * np.clip((z + 0.7) / 1.3, 0, 1)
col = par[:, :3].astype(np.float32) / 255.0

rgb = np.zeros((W, W, 3), dtype=np.float32)    # premultiplicado
alpha = np.zeros((W, W), dtype=np.float32)
for i in np.argsort(z):                        # de atrás hacia adelante
    r = radius[i]; ri = int(np.ceil(r))
    cx, cy = int(round(px[i])), int(round(py[i]))
    x0, x1 = max(cx - ri, 0), min(cx + ri + 1, W)
    y0, y1 = max(cy - ri, 0), min(cy + ri + 1, W)
    if x0 >= x1 or y0 >= y1:
        continue
    gx, gy = np.meshgrid(np.arange(x0, x1) - px[i], np.arange(y0, y1) - py[i])
    a = np.clip(r + 0.5 - np.sqrt(gx * gx + gy * gy), 0, 1) * fade[i]   # borde suavizado
    rgb[y0:y1, x0:x1] = rgb[y0:y1, x0:x1] * (1 - a[..., None]) + col[i] * a[..., None]
    alpha[y0:y1, x0:x1] = alpha[y0:y1, x0:x1] * (1 - a) + a

out = np.zeros((W, W, 4), dtype=np.float32)
out[..., :3] = rgb / np.maximum(alpha, 1e-6)[..., None]
out[..., 3] = alpha
img = bpy.data.images.new('poster', W, W, alpha=True)
img.pixels.foreach_set(np.ascontiguousarray(out[::-1]).ravel())   # Blender guarda las filas de abajo hacia arriba
path = os.path.join(ROOT, 'public', 'posters', f'{SHAPE}.webp')
os.makedirs(os.path.dirname(path), exist_ok=True)
img.filepath_raw = path
img.file_format = 'WEBP'
bpy.context.scene.render.image_settings.quality = 85
img.save()
print('POSTER', path)
