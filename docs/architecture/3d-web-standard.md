# Estándar de arquitectura — escenas WebGL de partículas (malla volumétrica) en React

> Esta es la copia de referencia bundlada con la skill `webgl-scene-brief`, usada como semilla para proyectos nuevos que todavía no tienen su propio `docs/architecture/3d-web-standard.md`. Si el proyecto actual ya tiene su copia, esa gana — puede tener ajustes específicos que no están acá.

**Origen:** derivado de la evidencia real encontrada en un clon estático del sitio dala.craftedbygc.com (`models/py-lod*.glb`, `images/pos-33.exr`, `images/cd-33.png`, `images/sc-33.png`, `images/noise.jpg`, `images/dof-2k-10.jpg`). El sitio original es un bundle de producción ya minificado — no es legible como fuente — así que este estándar no es una copia del código original, sino la reconstrucción del **patrón técnico** que esos assets evidencian, adaptado a un stack React moderno.

---

## 1. Cuándo aplica

Escenas WebGL protagonistas (hero de landing, fondo de sección) construidas a partir de una malla 3D cuyos vértices se usan como distribución espacial de miles de partículas — el patrón visual de "logo/forma que respira y se disuelve en puntos". No cubre UI de producto, dashboards, ni geometría renderizada tradicionalmente (mallas sólidas con materiales PBR normales).

## 2. Stack de referencia

| Capa | Elección | Por qué |
|---|---|---|
| Build | Vite + React + TypeScript | Estándar de facto para SPA con assets binarios grandes; HMR rápido con shaders |
| Render 3D | `@react-three/fiber` (R3F) + `three` | Reconciliador declarativo de Three.js en React |
| Helpers | `@react-three/drei` | `useGLTF`, `useTexture`, `useFBO`, `PerformanceMonitor`, `AdaptiveDpr`, `Preload`, `Loader` |
| Compute de partículas | TSL (`three/tsl`) + `WebGPURenderer` como primario; `GPUComputationRenderer` (WebGL2) como fallback | `WebGPURenderer` cae a WebGL automáticamente cuando el navegador no soporta WebGPU |
| Post-procesado | `@react-three/postprocessing` | Bloom/vignette baratos; DOF real solo en tier alto — en tiers bajos, fondo pre-renderizado con bokeh (como `dof-2k-10.jpg`) |
| Orquestación de scroll | GSAP + ScrollTrigger vía `@gsap/react` (`useGSAP`) | Estándar de la industria para timelines ligadas a scroll |
| Panel de debug | `leva` | Tunear ruido/cantidad de partículas/color en dev; fuera del bundle de producción |
| Compresión de modelos | `gltf-transform` (CLI) con Meshopt | Decoder liviano; suficiente para mallas usadas solo como nube de puntos |

## 2.1 Addendum de este proyecto — ubicación de archivos fuente

El estándar bundleado no define dónde vive el archivo de trabajo (`.obj`/`.blend`) antes de exportarlo — solo cubre `public/models/<escena>/` para los GLB ya optimizados que se sirven al navegador. Convención para este proyecto:

```
assets-source/
  models/<nombre-escena>/
    <archivo-fuente>.obj   # o .blend — nunca se importa desde src/ ni se copia a public/ tal cual
```

`assets-source/` no se bundlea ni se sirve — es insumo para el pipeline de exportación de §6, cuyo resultado sí va a `public/models/<escena>/`.

## 3. Estructura de carpetas

```
src/
  scenes/
    <nombre-escena>/
      HeroParticles.tsx           # componente R3F, orquesta todo
      useParticleField.ts         # hook: carga texturas, arma el compute
      particle.vert.glsl
      particle.frag.glsl
      gpgpu.compute.ts            # paso de simulación (TSL o GPUComputationRenderer)
      deviceTier.ts               # heurística de selección de tier/LOD
  components/
    canvas/
      SceneCanvas.tsx             # <Canvas>, dpr, pérdida de contexto, fallback
      ScenePoster.tsx             # fallback estático (reduced-motion / sin WebGL)
      PersistentSceneLayer.tsx    # monta EL canvas persistente en el root de la app (fixed, full-viewport)
      PageCamera.tsx / pageCameraMath.ts  # cámara compartida + anchorToWorldXY (DOM -> mundo 3D)
public/
  models/<nombre-escena>/
    lod1.glb  lod2.glb  lod3.glb  mobile.glb
  textures/<nombre-escena>/
    positions.exr  color.png  aux.png  noise.jpg
  scene-manifest.json
tools/
  blender/
    export_lods.py
    bake_position_map.py
  scripts/
    optimize-glb.mjs
docs/
  architecture/
    3d-web-standard.md
```

**Nota (agregada tras el spike T9):** `SceneCanvas` se monta **una sola
vez, en la raíz de la app** (vía `PersistentSceneLayer`, `position: fixed`
cubriendo el viewport), no dentro de cada sección. Las secciones no
reciben su propio `<Canvas>` boxeado -- contribuyen contenido/grupos al
canvas persistente y posicionan ese contenido anclándolo a la posición en
pantalla de un elemento DOM normal de esa sección (hook
`useElementViewportAnchor` + `anchorToWorldXY` de `pageCamera.ts`), nunca
recortándolo a una caja (ver `anchorToWorldXY` en `pageCameraMath.ts`).
Los `.stage`/`.visual` de la maqueta son marcadores de posición para ese
ancla, no contenedores de render.

## 4. El patrón central: de malla a partículas

1. **Malla base en Blender**, un solo objeto, exportada a glTF/GLB en varios niveles de decimación (LOD1 = mayor detalle, números más altos = más decimado, terminando en una variante `mobile`).
2. **Bake de posiciones**: las coordenadas XYZ de cada vértice se escriben en una textura flotante (EXR — PNG de 8 bits no tiene precisión suficiente) — un píxel = una partícula.
3. **Texturas auxiliares** opcionales, mismo índice de píxel que el mapa de posiciones: color por partícula, escala/semilla de aleatoriedad.
4. **Compute en GPU cada frame**: TSL o `GPUComputationRenderer` (ping-pong de render targets) lee el mapa de posiciones como estado inicial/objetivo, y actualiza cada partícula por frame — curl noise para turbulencia, atracción hacia mouse/scroll, easing entre formas.
5. **Render de partículas**: material de puntos/instancing que lee la textura calculada para posicionar cada partícula en el vertex shader.
6. **Fondo/profundidad barata**: fondo pre-renderizado con bokeh ya difuminado en vez de post-proceso DOF real.

### Dos variantes válidas del pipeline

**A — Directo en runtime.** Cargar el GLB con `useGLTF`, leer `position` de la geometría en el navegador, escribirlo en un `DataTexture` al vuelo. Sin bake offline. Hasta ~15-20k partículas o para prototipar.

**B — Baked offline.** El bake a EXR ocurre en build-time; en runtime solo se carga la textura. Escala a cientos de miles de partículas, y el conteo de partículas es independiente del conteo de vértices reales. Recomendado para igualar la calidad de referencias tipo Dala/Akella.

## 5. Niveles de detalle y presupuesto de performance

Puntos de partida — ajustar con mediciones reales (`stats.js`, Chrome DevTools Performance) en el hardware objetivo:

| Tier | Partículas (aprox.) | Resolución del mapa | Post-procesado | dpr máx |
|---|---|---|---|---|
| Desktop alto | 150k–250k | 512×512 | Bloom + DOF real opcional | 2 |
| Desktop/laptop medio | 50k–80k | 256×256 | Bloom | 1.5 |
| Mobile | 10k–20k | 128×128 | Ninguno (fondo pre-renderizado) | 1.5 |
| Reduced motion / sin WebGL | 0 (poster estático) | — | — | — |

## 6. Pipeline de assets

### 6.1 Modelado en Blender
- Un solo objeto, nombre descriptivo.
- Aplicar todas las transformaciones antes de exportar (`Ctrl+A → All Transforms`).
- Modifier **Remesh (Voxel)** antes de decimar, para densidad de vértices uniforme.
- Un modifier **Decimate (Collapse)** por nivel de LOD.

### 6.2 Exportación
glTF/GLB binario, un archivo por LOD.

### 6.3 Compresión
Solo si el GLB se sirve al cliente (variante A):
```bash
npx gltf-transform optimize lod1.glb lod1.optimized.glb --compress meshopt
```

### 6.4 Bake del mapa de posiciones

**Con Blender MCP:** ejecutar un script Python dentro de Blender que recorra `mesh.vertices`, normalice al rango [0,1] (guardando el bounding box aparte), y escriba un buffer flotante RGB a EXR de tamaño `ceil(sqrt(n_vertices))²`:

```python
import bpy, numpy as np

obj = bpy.data.objects["particles-source"]
mesh = obj.data
verts = np.array([v.co for v in mesh.vertices], dtype=np.float32)

n = len(verts)
size = int(np.ceil(np.sqrt(n)))
buffer = np.zeros((size, size, 4), dtype=np.float32)
buffer[:, :, :3].reshape(-1, 3)[:n] = verts
# Guardar bounding box en scene-manifest.json; escribir buffer a EXR
# con la API de imágenes de Blender o con OpenEXR/Imath.
```

**Sin Blender MCP:** leer el accessor `POSITION` del GLB exportado (`@gltf-transform/core`) y escribir el mismo buffer a EXR con una librería JS de OpenEXR, o degradar a `.png` de 16 bits por canal si no se puede depender de EXR.

### 6.5 Convención de nombres

`<escena>-<tipo>-<lod>.<ext>`:
```
hero-mesh-lod1.glb       hero-mesh-mobile.glb
hero-positions-lod1.exr  hero-positions-mobile.exr
hero-color-lod1.png
hero-noise.jpg
```

### 6.6 `scene-manifest.json`

```json
{
  "hero-particles": {
    "lods": {
      "lod1": { "vertices": 262144, "texture": "hero-positions-lod1.exr", "textureSize": 512 },
      "lod2": { "vertices": 65536,  "texture": "hero-positions-lod2.exr", "textureSize": 256 },
      "mobile": { "vertices": 16384, "texture": "hero-positions-mobile.exr", "textureSize": 128 }
    },
    "boundingBox": { "min": [-1, -1, -1], "max": [1, 1, 1] }
  }
}
```

## 7. Reglas de integración en React/R3F

- Nunca `setState` de React dentro de `useFrame` — mutar uniforms/refs directamente.
- Selección de tier por dispositivo: `navigator.hardwareConcurrency` + `navigator.deviceMemory` (si existe) + ancho de viewport como proxy de mobile. Nunca sniffear el string del renderer WebGL como única señal.
- Manejar `webglcontextlost`/`webglcontextrestored` explícitamente.
- Fallback obligatorio para `prefers-reduced-motion` y ausencia de WebGL/WebGPU: `ScenePoster.tsx` estático, nunca pantalla en blanco.
- Carga con `Suspense` + `Preload`/`Loader` de drei; nunca bloquear el resto de la página.
- TSL + `WebGPURenderer` como primario; `GPUComputationRenderer` solo con una razón concreta y verificada de compatibilidad.

## 8. Checklist — Definition of Done

- [ ] `scene-manifest.json` actualizado con todos los tiers
- [ ] Los 3 tiers probados en dispositivos reales (no solo emulación)
- [ ] `prefers-reduced-motion` muestra el poster, verificado manualmente
- [ ] Pérdida de contexto WebGL probada
- [ ] Ningún `setState` dentro de `useFrame`
- [ ] Tier alto no baja de 60fps en el hardware de referencia del proyecto
- [ ] Nombres de archivos siguen la convención de §6.5
