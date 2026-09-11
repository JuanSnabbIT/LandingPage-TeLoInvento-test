# Estándar de arquitectura — escena WebGL de partículas (nube persistente) en React

> **Esta es la copia del proyecto**, no la semilla bundlada con la skill
> `webgl-scene-brief`. Describe la escena v2 ("la nube") tal como está en el
> código, tras el refactor cerrado el 2026-09-11. La spec de diseño que la
> originó vive en el vault: `13-spec-diseno-nube.md` (y sus desviaciones de
> implementación, en su §15). El registro de decisiones es
> `09-registro-decisiones.md` del vault — este documento no decide, describe.

---

## 1. Cuándo aplica

Escenas WebGL protagonistas construidas a partir de mallas 3D cuyas
superficies se muestrean como distribución espacial de decenas de miles de
partículas, ancladas a cajas del DOM y conducidas por el scroll. No cubre UI
de producto, dashboards, ni geometría sólida renderizada de forma tradicional
(en este proyecto solo la Central del Hero es sólida, y convive con la nube en
el mismo canvas).

## 2. Stack real

| Capa | Elección | Por qué |
|---|---|---|
| Build | Vite 8 + React **19.2.8 pineado** + TypeScript | React fijo exacto: `@react-three/fiber` 9 lo declara como peer |
| Render 3D | `three` 0.186 + `@react-three/fiber` 9 | Reconciliador declarativo; r3f 9 exige WebGL2 |
| Contexto | **WebGL2** únicamente (`scene/webglSupport.ts`) | three r186 no soporta WebGL1; sin WebGL2 → poster |
| Shaders | `ShaderMaterial` con `glslVersion: THREE.GLSL3` | `texelFetch` + `gl_VertexID` sin atributos; sin `#version` ni `precision` propios (three prepende el prefijo GLSL3) |
| Helpers | `@react-three/drei` | Solo `useGLTF` (+ `preload`) para la Central del Hero |
| Carga suspendida | `suspend-react` | `useShapeTextures` suspende **solo** las dos formas del tramo 0 |
| Orquestación de scroll | `gsap` 3 + `ScrollTrigger` | Un tween scrubbeado por tramo; `gsap.ticker` es el único loop |
| Tests | vitest 3 + jsdom, `@react-three/test-renderer`, Playwright, tests planos con numpy para el horneado | Ver §8 |
| Lint | oxlint | `npm run lint` |

**Explícitamente descartado** (no está en el código ni debe volver sin ADR):

- **TSL / `WebGPURenderer`** — rechazado: el proyecto es WebGL2 puro.
- **Simulación GPGPU con estado** (ping-pong de render targets) — rechazado:
  el scroll va y vuelve, la forma tiene que ser **función pura del progreso**,
  y una simulación con estado no es reversible.
- **Texturas de posiciones en EXR** — rechazado: exigiría un loader extra
  (+40 KB) y decodificación. Se usan `.bin` half-float crudos (§6).
- **Post-procesado** (bloom, DOF) — no se usa.
- **`leva`** — desinstalado; el harness de debug es `?debug` + `window.__scene`
  (`scene/debug.ts`), sin peso en el bundle de producción.
- **Compresión meshopt/Draco** — irrelevante: los GLB ya no se sirven al
  navegador salvo `central-v2.glb`; el resto solo alimenta el horneado.

## 2.1 Addendum de este proyecto — ubicación de archivos fuente

El estándar bundleado no define dónde vive el archivo de trabajo
(`.obj`/`.blend`/GLB fuente) antes de exportarlo — solo cubre
`public/models/<escena>/` para los GLB ya optimizados que se sirven al
navegador. Convención para este proyecto:

```
assets-source/
  models/<nombre-escena>/
    <archivo-fuente>.blend | .glb   # nunca se importa desde src/
  tools/                            # scripts de Blender headless
```

`assets-source/` no se bundlea ni se sirve — es insumo del pipeline de §6. Con
la escena v2, el único GLB que el navegador descarga es
`public/models/hero-central/central-v2.glb` (la Central sólida del Hero); todo
lo demás se consume offline al hornear.

Corolario operativo: **un GLB que solo alimenta el horneado nunca vive bajo
`public/`**. Si está ahí, Vite lo copia a `dist/` y el visitante paga bytes que
nadie descarga a propósito (eran ~210 kB entre `nodo.glb` y los tres GLB de
Capacidades). Las fuentes de `shapes.json` apuntan a `assets-source/models/`.

## 3. Estructura de carpetas (real)

```
src/
  scene/                     # genérico: capa, host, canvas, ticker, anclaje, registry
    PersistentSceneLayer.tsx   # div fixed full-viewport, z 5, aria-hidden
    PageSceneHost.tsx          # poster vs canvas; WebGL2, degradación con TTL, ?no3d/?force3d
    PageSceneCanvas.tsx        # <Canvas frameloop="never"> + hijos, cada uno en Suspense+boundary
    SceneTicker.tsx            # gsap.ticker → advance() solo si dirty
    SceneLights.tsx            # rig único key/fill/rim
    scenePalette.ts            # colores 3D derivados de tokens.css
    PageCamera.tsx / pageCameraMath.ts
    anchoring.ts               # computeAnchorTransform + anchorMatrix (rect DOM → mundo)
    registry.ts                # slots, proveedores de pose, progresos, dirty
    useSceneSlot.ts            # hook que una sección usa para declarar su caja
    deviceTier.ts / webglSupport.ts / frameBudget.ts / FrameBudgetGuard.tsx
    SlotErrorBoundary.tsx / debug.ts
    cloud/                   # la nube
      ParticleCloud.tsx        # un <points> con matriz identidad; poses en uniforms
      sequence.ts              # TRAMOS (datos) + resolveTramo (pura) + quantize
      useShapeTextures.ts      # carga/caché/reintento de las texturas horneadas
      shapeLoader.ts           # manifest + .bin → DataTexture RGBA16F
      cloud.vert.ts / cloud.frag.ts / curl.glsl.ts   # GLSL3 sin estado
      scissor.ts               # unionRect + corridorRect (recorte del renderer)
      cloudTokens.ts           # tamaño de punto, stagger, curl, alphas, fluye, travelDip
    hero-central/            # la Central sólida del Hero
      HeroCentral.tsx          # anclada a .hero__anchor; provee la pose 'hero-display'
      bestFitPlane.ts / glow.vert.ts / glow.frag.ts
  motion/
    tokens.ts                  # ease, duraciones, stagger, parallax, tramo, scrub
    scrollTrigger.ts           # registerPlugin + config + createScrub (tween enlazado)
    useTramoScrubs.ts          # un tween scrubbeado por tramo → registry.setProgress
    useSectionReveals.ts       # reveals de DOM por sección
  sections/                    # las 9 secciones; las que alojan nube llaman useSceneSlot
  styles/scene.css             # escenarios bajo html.scene-3d + gate html.scene-poster
assets-source/
  tools/
    bake_positions.py          # Blender headless: GLB → .bin/.json por forma y LOD
    shapes.json                # definición declarativa de las 6 formas
    test_bake_positions.py     # tests del horneado; se corren BAJO Blender (usan bpy)
    render-poster.py           # Eevee → public/posters/central-v2.webp
  models/<escena>/             # fuentes .blend/.glb (incluye los GLB retirados)
    nodo/nodo.glb              # insumos SOLO de horneado: nunca bajo public/
    capacidades-glb/*.glb
scripts/
  write-manifest.mjs           # public/scene-manifest.json desde los .json horneados
public/
  models/hero-central/central-v2.glb   # único GLB que descarga el navegador
  textures/particulas/<forma>-positions-<lod>.{bin,json}
  posters/central-v2.webp
  scene-manifest.json
e2e/
  scene.spec.ts / scene-mobile.spec.ts / scene-budget.spec.ts
docs/
  architecture/3d-web-standard.md
  qa/v2/                        # capturas por tramo
```

Regla estructural: **un solo `<Canvas>`, montado una vez en la raíz de la app**
(`App.tsx` → `PersistentSceneLayer` → `PageSceneHost`), nunca dentro de una
sección. Las secciones no reciben un canvas boxeado: **declaran** su caja con
`useSceneSlot` y el canvas la lee por `getBoundingClientRect()` en el mismo
frame en que dibuja. El DOM es dueño del layout.

## 4. El patrón central: morph sin estado entre dos formas horneadas

La variante elegida (ADR del 2026-09-11 en el vault):

1. **Horneado offline** (§6): cada forma se muestrea sobre la superficie de sus
   mallas y se escribe como textura de posiciones `.bin` half-float. Un píxel =
   una partícula; el índice del píxel es **la identidad de la partícula** y es
   el mismo en todas las formas de un LOD.
2. **Runtime sin atributos**: la geometría es un `BufferGeometry` con un
   `position` vacío de `S·S` vértices, solo para fijar el conteo. El vertex
   shader usa `gl_VertexID` y `texelFetch(uShapeA/B, ivec2(id % S, id / S), 0)`
   — no depende de centros de texel ni de filtrado.
3. **La forma es función pura del scroll**: `resolveTramo(progress, TRAMOS, …)`
   devuelve `{a, b, t, alpha, kind}`; el shader interpola
   `p = mix(poseA·a.xyz, poseB·b.xyz, tl)` con
   `tl = smoothstep(clamp((uT − seed·uStagger)/(1 − uStagger)))`. Sin estado:
   scrollear hacia atrás deshace exactamente el morph.
4. **Curl solo en vuelo**: turbulencia curl-noise calculada en el shader,
   modulada por `sin(π·tl)` — vale 0 en ambos extremos — y con rama por uniform
   (`uCurlOn`), así en reposo cuesta 0 ALU. El tramo 0 suma el término "Fluye"
   (caída + curl extra, `cloudTokens.fluye`).
5. **Las poses van en uniforms, no en el grafo**: el `<points>` queda con
   matriz identidad; `uPoseA`/`uPoseB` son las matrices de anclaje de las dos
   cajas. Elimina por construcción la clase de bugs de "matriz de mundo
   desactualizada un frame".
6. **Un único objeto sólido** convive en el mismo canvas: la Central del Hero,
   con `depthTest` activo, ocluye las partículas que pasan por detrás.

**No es GPGPU.** No hay render targets de simulación, ni ping-pong, ni estado
entre frames. Todo el estado vive en un número: el progreso del tramo.

## 5. Presupuesto de partículas y tiers

`S` (lado de la textura) se fija **al cargar** y no cambia en caliente: cambiar
`S` rompería la identidad píxel→partícula. En caliente solo se mueven `dpr` y
`uCurlOn`.

| Tier (`scene/deviceTier.ts`) | Condición | LOD | `S` | Partículas | dpr máx | Curl |
|---|---|---|---|---|---|---|
| high | ancho ≥1024 y ≥8 cores | `lod2` | 256 | 65 536 | 2 | sí |
| medium | ancho ≥768 y ≥4 cores | `lod2` | 256 | 65 536 | 1.5 | sí |
| low | resto (mobile) | `mobile` | 128 | 16 384 | 1 | no |
| sin WebGL2 / degradado | — | — | — | 0 (poster) | — | — |

Por qué 65 536 y no las 150k–250k que sugería el estándar semilla: esta nube
**convive con texto** en cajas de ~320 px y con una Central sólida, no ocupa un
hero a pantalla completa. Más puntos saturan la caja y ensucian el papel claro.
Además fija el presupuesto de red: 512 KB por forma en desktop (S=256 × 4
canales half-float) y 128 KB en mobile, con solo dos formas cargadas al inicio
(tramo 0) y una más por anticipado por tramo.

## 6. Pipeline de assets

### 6.1 Fuentes

Mallas en Blender, exportadas a GLB a `assets-source/models/<escena>/`. No hace
falta remesh ni decimate: el horneado **muestrea la superficie por área**, no
los vértices, así que la densidad de la malla no determina la distribución.

### 6.2 Definición declarativa — `assets-source/tools/shapes.json`

Las siete formas (`logo`, `nodo`, `nodo-explotado`, `set`, `capacidades`,
`central`, `wifi`), sus fuentes GLB, y por forma: `offset`/`scale`/`yaw`/
`pitch`/`exclude` por fuente, `explode` (desplazamiento por **nombre exacto de
malla**), `flatten`, `shell`, `pairWith`, `colors` (material → hex, hornea una
textura de color por partícula). Global: `seed`, `lods` (`lod2`: 256,
`mobile`: 128), `outDir`.

`pitch` gira la fuente sobre X en espacio Blender: endereza una pieza modelada
acostada en XY, que bajo la pose `tresCuartos` (14° de inclinación) se vería de
canto. `exclude` descarta mallas por nombre base **antes** de medir los límites
y de repartir partículas por área — necesario cuando una pieza decorativa
domina la superficie (el disco de tierra de `riego.glb` es el 81.7 % de ella).
Igual que `explode`, un nombre que no matchea **aborta con exit ≠ 0**.

Una regla de `explode` que no matchea ninguna malla **aborta con exit ≠ 0** —
un re-export que renombre piezas es error de build, no asset silencioso.

### 6.3 Horneado — `assets-source/tools/bake_positions.py`

```bash
blender -b --python assets-source/tools/bake_positions.py
blender -b --python assets-source/tools/bake_positions.py -- --shape nodo --lod mobile
```

(El nombre lleva guion bajo, no guion medio: el módulo tiene que ser
importable desde los tests.)

Por forma y LOD:

1. **Importa** las fuentes GLB y aplica composición (escala relativa al primer
   `max_dim`, yaw, offset) y el `explode` por nombre exacto.
2. **Muestrea** `S·S` puntos sobre los triángulos, con probabilidad
   proporcional al **área en espacio de mundo** — no `f.calc_area()`, que es el
   área local e ignora la escala del objeto. Con ese bug, `Chassis_ClipTab`
   (un cubo unitario con escala de objeto minúscula) se llevaba el 98 % de las
   partículas. Opcionalmente empuja hacia adentro (`shell`) para dar volumen.
3. **Ejes**: el importador glTF de Blender convierte Y-up → Z-up. Las formas
   sólidas vuelven a Y-up con `blender_to_yup()` (Blender `(x,y,z)` → glTF
   `(x, z, −y)`); sin esa vuelta el eje alto del asset queda en la profundidad
   de la escena y la Central se ve acostada en su caja.
4. **Aplanado** (`flatten: true`, solo el logo): proyección PCA al plano de
   mejor ajuste con **la regla del "arriba" del asset** — la normal es el eje de
   menor varianza (con signo fijado por el frente), el eje Y sale de proyectar
   el "arriba" del asset (+Z en Blender) sobre ese plano, y X = Y × N. **No** se
   toma el eje de mayor varianza como X: eso giraba el logo 90° dentro de la
   pantalla.
5. **Normaliza** a `[-1, 1]` por el eje mayor (de ahí `maxDim = 2` en runtime).
6. **Ordena por curva de Hilbert 3D** (Skilling; 8 bits en `lod2`, 6 en
   `mobile`). Es diseño, no optimización: vecinos en A son vecinos en B, así el
   morph fluye en vez de explotar.
7. **Pares** (`pairWith`): `nodo` y `nodo-explotado` comparten `rng`, así que
   comparten triángulos y baricéntricas; ambos se generan **sin** reorden
   Hilbert, para que el índice `i` sea la misma pieza física en las dos formas.
8. **Semilla**: `mulberry32` determinista por índice desde la `seed` global,
   idéntica en todas las formas de un LOD (va en el canal alpha). La semilla
   por forma usa `zlib.crc32(nombre)`, no `hash()` de Python (salteado por
   proceso, rompería la reproducibilidad).

Salida en `public/textures/particulas/`:

- **`<forma>-positions-<lod>.bin`** — `Uint16Array` de `S·S·4` half-floats,
  fila-mayor, `(x, y, z, seed)`. 512 KB (S=256) / 128 KB (S=128).
- **`<forma>-positions-<lod>.json`** — `{ shape, lod, size, count, bbox,
  sources, generatedAt }`.

En runtime, `shapeLoader.ts` valida `byteLength === size·size·8` y arma un
`DataTexture(RGBAFormat, HalfFloatType, NearestFilter, flipY:false)`.

### 6.4 Manifest — `scripts/write-manifest.mjs`

```bash
npm run manifest
```

Recorre los `.json` horneados y escribe `public/scene-manifest.json`:
`{ shapes: { <forma>: { lod2 | mobile: { file, size, count, bbox } } },
sequence, tiers: { high: 'lod2', medium: 'lod2', low: 'mobile' },
generatedAt }`. **Se regenera después de cada horneado.**

### 6.5 Poster — `assets-source/tools/render-poster.py`

```bash
blender -b --python assets-source/tools/render-poster.py
```

Render Eevee de `central-v2.glb` a `public/posters/central-v2.webp`. Es el
fallback del Hero: vive en el DOM dentro de `.hero__anchor`, no en la capa fija.

### 6.6 Convención de nombres

`<forma>-positions-<lod>.{bin,json}` para la nube; `<escena>/<modelo>.glb`
para los GLB; `<modelo>.webp` para posters.

## 7. Reglas de integración en React/R3F

**Un solo ticker.** `frameloop="never"` en el `<Canvas>`; `SceneTicker` se
suscribe a `gsap.ticker` (después de `registerPlugin`, por lo tanto después de
que ScrollTrigger actualizó los tweens en el mismo tick) y llama `advance()`.
Nunca un segundo rAF. **`advance(timestamp)` bajo `frameloop="never"` calcula
`delta = timestamp − clock.elapsedTime` literalmente**, así que el timestamp
que se le pasa fija la unidad de `delta` que reciben todos los `useFrame`: se
le pasa el `time` de `gsap.ticker`, que ya viene **en segundos**, sin `*1000`.

**Render gateado por `dirty`.** El `registry` marca sucio en: `onUpdate` de
cualquier tramo, `pointermove` sobre el Hero, `resize`, carga de forma,
crossfade de reduced-motion. `SceneTicker` renderiza mientras haya dirty y 1 s
después (para que el scrub de 0.4 s asiente). En reposo real: 0 frames.

**Registry / slots / proveedores de pose.** Una sección declara su caja:

```tsx
useSceneSlot({ id: 'problema', anchorRef: ref, fit: 0.72, pose: 'tresCuartos', surface: 'light' });
```

`fit` es fracción del **lado menor** de la caja, así nada desborda en anchos
intermedios (`fit` 0.72 en las cajas `.visual`/`.photo-ph`, 1.45 en la franja
apaisada de Capacidades, 0.8 para la Central del Hero). El Hero es la
excepción al rect: en vez de registrar una caja registra un **proveedor de
pose** (`registerPoseProvider('hero-display')`) que devuelve la matriz del
plano de la pantalla de la Central, para que el logo nazca dentro del display.
Los scrubs de tramo se montan en un componente propio **después** de las
secciones, para que todos los slots ya estén registrados.

**Scissor de corredor — la nube nunca dibuja sobre texto.** La capa está en
z 5 (sobre el contenido, bajo el header en z 20): los fondos de sección son
opacos, así que ponerla debajo la haría invisible. La garantía de "nunca sobre
texto" la da el renderer, no el z-order: en `onBeforeRender` la nube activa
`setScissorTest` con `corridorRect(rectA, rectB, t, stagger, 0.2, viewport)` —
la unión de las dos cajas interpoladas a lo largo del camino A→B en el
progreso mínimo y máximo del enjambre (el mismo `smoothstep` con stagger del
vertex shader), más 20 % de margen. En reposo es la caja; en vuelo es un
corredor que sigue al enjambre, no la pantalla entera. Además la alpha baja a
mitad del viaje (`×(1 − 0.35·sin πt)`). `setScissor` recibe **píxeles CSS con
origen abajo-izquierda**; three aplica el dpr internamente.

**Nunca `setState` de React dentro de `useFrame`** — mutar uniforms y refs.

**Reduced-motion (contrato).** `prefers-reduced-motion` ⇒ el progreso llega
**cuantizado** (0 o 1, con histéresis ±0.05 alrededor de 0.5): estados finales
por sección, sin viaje. Al cambiar la forma efectiva se hace un fundido de
alpha de 200 ms (`motion.duration.crossfade`). Sin curl, sin parallax de
puntero, sin reveals.

**Degradación medida, no sniffeada.** `FrameBudgetGuard` mide **solo ventanas
de frames contiguos** (`delta ≤ maxDelta = 0.3 s`, que permite contar hasta
~3.3 fps; gaps mayores reinician la ventana, así una pestaña en segundo plano
nunca degrada), tras 2 s de calentamiento; 3 ventanas de 1 s seguidas bajo
24 fps disparan un escalón. Escalones: `dpr 1.5 → dpr 1 → uCurlOn = 0 →
reduced → poster`. El último se persiste en `sessionStorage` bajo la clave
`teloinvento:scene-degraded` con **TTL de 1 h**.

**Fallbacks.** Sin WebGL2 o degradado, `PageSceneHost` no monta el canvas y
agrega `html.scene-poster`, que es lo único que muestra `.hero__poster` (el
poster está en `display:none` por defecto: así no parpadea antes de que el
canvas esté listo). `html.scene-3d` se agrega **cuando la nube reporta listo**,
no al montar, y es lo que vuelve transparentes las cajas-escenario y revela la
franja de Capacidades; como ese cambio mueve el layout ~244 px, el host hace
`ScrollTrigger.refresh()` en el frame siguiente.

**Aislamiento de fallos.** Cada hijo del canvas va en su propio
`<Suspense fallback={null}>` + `SlotErrorBoundary` (fallback `null`, **nunca**
DOM): si falla la Central, la nube sigue; si falla la nube, la Central sigue.
Una forma que no cargó deja `t = 0` (la nube espera en A) y el siguiente
`ensure()` reintenta.

**Flags de URL.** `?debug` (markers de ScrollTrigger + `window.__scene` con
`registry`, `resolve()`, `progress()`, `tier`), `?no3d` (fuerza poster),
`?force3d` (ignora la degradación persistida), `?debug&budget=1` (fuerza al
guard a degradar en pocos frames, para el e2e).

## 8. Checklist — Definition of Done

Puertas automáticas (todas tienen que pasar):

- [ ] `npx tsc -b` sin errores (`npm run build` lo incluye)
- [ ] `npm test` — vitest: `anchoring`, `sequence.resolveTramo`, `registry`,
      `frameBudget`, `deviceTier`, `webglSupport`, `pageCameraMath`,
      `scissor`, `shapeLoader` / `useShapeTextures`, shaders, `SceneTicker`,
      `scrollTrigger.createScrub`, smoke r3f de `ParticleCloud`
- [ ] `npm run build` limpio
- [ ] `npm run lint` (oxlint) sin errores
- [ ] `npm run e2e` (Playwright, Chromium, dev server en **5199**):
      tramos avanzan con el scroll, reduced-motion cuantiza, `?no3d` muestra
      poster + placeholders, mobile sin desborde horizontal, el guard degrada
- [ ] Tests del horneado:
      `blender -b --python assets-source/tools/test_bake_positions.py`
      (localidad Hilbert, misma semilla por índice, roundtrip half-float,
      regla del "arriba" del asset en `flatten`, área en espacio de mundo,
      vuelta a Y-up de las formas sólidas, orden de Hilbert compartido por un
      par `pairWith` y su base). **Bajo Blender, no bajo `python` a secas**:
      varios tests importan `bpy` (y el del par hornea de verdad `nodo` /
      `nodo-explotado`), y `bake_positions.py` lo importa en su primera línea,
      así que ni siquiera se puede importar el módulo fuera de Blender.

Puertas manuales:

- [ ] `public/scene-manifest.json` regenerado (`npm run manifest`) tras cada horneado
- [ ] Ningún `setState` dentro de `useFrame`
- [ ] Los tres tiers probados en dispositivo real, no solo emulación (T16 abierta)
- [ ] `prefers-reduced-motion` verificado a mano
- [ ] Capturas por tramo revisadas (`docs/qa/v2/`)
- [ ] Nombres de archivo según §6.6
