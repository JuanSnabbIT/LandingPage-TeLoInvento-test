# Estándar de arquitectura — escena WebGL de partículas (nube persistente) en React

> **Esta es la copia del proyecto**, no la semilla bundlada con la skill
> `webgl-scene-brief`. Describe la escena v3 ("la nube") tal como está en el
> código al 2026-09-14, tras dos refactors: el del 2026-09-11 (morph sin
> estado, seis formas, siete tramos — sigue vigente en lo estructural; al
> 2026-09-14 son nueve formas y diez tramos, dos de ellos con driver propio — scroll
> horizontal fijado en desktop, click en teléfono —, ver §5) y el
> del 2026-09-14 (vuelta de mallas instanciadas por partícula a puntos +
> "redes de superficie", y de transición disparada a scroll scrubbeado). La
> spec de diseño original vive en el vault: `13-spec-diseno-nube.md` (y sus
> desviaciones de implementación, en su §15). El registro de decisiones es
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

`assets-source/` no se bundlea ni se sirve — es insumo del pipeline de §6.
Desde el 2026-09-14 (Hero sin Central sólida) el navegador no descarga ningún
GLB: todo se consume offline al hornear, y sólo viajan las texturas horneadas
y el póster.

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
      ParticleCloud.tsx        # <points> + 2 <lineSegments> ("redes"), matriz identidad, poses en uniforms
      sequence.ts              # TRAMOS (datos, con sweep por tramo) + resolveTramo (pura) + quantize
      capacidadesCarousel.ts   # tarjeta activa del carrusel + progreso de los tramos manuales (posición del scroll horizontal en desktop, tween por click en teléfono)
      useShapeTextures.ts      # carga/caché/reintento de posiciones, params y links horneados
      shapeLoader.ts           # manifest + .bin → DataTexture RGBA16F / links → Uint32Array
      cloud.vert.ts / cloud.frag.ts / curl.glsl.ts   # GLSL3 sin estado, comparte puntos y redes
      sweep.ts                 # dirección/escala del barrido en espacio de objeto (JS, testeable)
      scissor.ts               # unionRect + corridorRect (recorte del renderer)
      cloudTokens.ts           # tamaño de punto, stagger, curl, spread, sweep, alphas
  motion/
    tokens.ts                  # ease, duraciones, stagger, parallax, tramo, scrub, tramoModo
    scrollTrigger.ts           # registerPlugin + config + createScrub (activo) + createTriggerTween (no usado hoy)
    useTramoScrubs.ts          # elige scrub vs. disparo según motion.tramoModo → registry.setProgress
    useSectionReveals.ts       # reveals de DOM por sección
  sections/                    # las 9 secciones; las que alojan nube llaman useSceneSlot
  styles/scene.css             # escenarios bajo html.scene-3d + gate html.scene-poster
assets-source/
  tools/
    bake_positions.py          # Blender headless: GLB → .bin/.json por forma y LOD
    shapes.json                # definición declarativa de las 9 formas
    test_bake_positions.py     # tests del horneado; se corren BAJO Blender (usan bpy)
    render-poster.py           # Eevee → public/posters/logo.webp (el logo, respaldo del Hero)
  models/<escena>/             # fuentes .blend/.glb — insumos SOLO de horneado, nunca bajo public/
    nodo/nodo.glb · capacidades/*.glb · hogar/hogar.glb (+ generar_modelo.py) · valor/*.glb · hero-central/* (logo-lod1.glb, central-v2.glb)
    particles/                 # mallas py-*.glb + targets.bin: archivado, no lo usa el pipeline actual (README ahí)
    inbox/                     # entregas del dueño del proyecto sin destino asignado aún
scripts/
  write-manifest.mjs           # public/scene-manifest.json desde los .json horneados
public/                        # el navegador no descarga ningún GLB: sólo texturas horneadas y el póster
  textures/particulas/<forma>-{positions,params,links}-<lod>.{bin,json}
  posters/logo.webp
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
2. **Runtime sin atributos**: la geometría de los puntos es un `BufferGeometry`
   con un `position` vacío de `S·S` vértices, solo para fijar el conteo. El
   vertex shader usa `gl_VertexID` y
   `texelFetch(uShapeA/B, ivec2(id % S, id / S), 0)` — no depende de centros de
   texel ni de filtrado. Las "redes de superficie" (líneas cortas entre
   partículas vecinas de una misma pieza, ver §5.1) son geometría aparte
   (`LineSegments` × 2) cuyo atributo `particleIndex` reemplaza a `gl_VertexID`
   como índice de partícula (`#ifdef SURFACE_LINES`), pero comparten el mismo
   `texelFetch` y el mismo cálculo de posición: un solo shader (`cloud.vert.ts`)
   sirve a los dos tipos de geometría.
3. **La forma es función pura del scroll**: `resolveTramo(progress, TRAMOS, …)`
   devuelve `{a, b, t, alpha, kind}`; el shader interpola
   `p = mix(poseA·a.xyz, poseB·b.xyz, local)` con `local` un smoothstep de
   `(uT − rank·uStagger)/(1 − uStagger)`, donde `rank` es el desfase por
   partícula (§5.2 — ordenado espacialmente por el barrido del tramo, ya no
   una semilla aleatoria). Sin estado: scrollear hacia atrás deshace
   exactamente el morph. Única excepción: los tramos riego → seguridad →
   hogar del carrusel de Capacidades llevan `driver: 'manual'` —
   `useTramoScrubs` no les crea ScrollTrigger y su progreso lo escribe otro
   driver (`cloud/capacidadesCarousel.ts`, `registry.setProgress`). En
   desktop (≥901 px), el **scroll horizontal fijado** de `Capacidades.tsx`
   (`gsap.matchMedia` + ScrollTrigger con `pin` y `scrub: true`): el carril de
   tarjetas se desliza dentro de una ventana y `setCapacidadesPosition` deriva
   el progreso de cada tramo de la posición REAL del carril (`x / paso`), así
   el morph va exactamente al ritmo de las tarjetas; la caja del modelo es un
   marcador fijo sobre la ventana, no está dentro de las tarjetas. Pausas
   con la tarjeta quieta y alto de scroll por tarjeta en
   `motion.capacidades`. En teléfono, un timeline GSAP desde el click, tramo
   por tramo (saltar dos tarjetas pasa por la del medio). Sigue siendo el
   mismo `resolveTramo`: al elegir el último tramo con progreso > 0, un
   carrusel en 0 cae al tramo de llegada (misma forma, `riego`) sin salto. El
   tramo siguiente declara `dynamicFrom` (origen = tarjeta activa) para
   arrancar de la forma que realmente se ve.
4. **Curl solo en vuelo**: turbulencia curl-noise calculada en el shader,
   modulada por `sin(π·local)` (`wing`, vale 0 en ambos extremos) y escalada
   al tamaño del morph (`uSpan`), con rama por uniform (`uCurlOn`) — así en
   reposo cuesta 0 ALU. Los tramos `morphEnSitio`/`apagado` fuerzan `uRigid: 1`
   y desactivan el desfase y la respiración del enjambre (`uSpread`, §5.2).
5. **Las poses van en uniforms, no en el grafo**: `<points>` y las
   `<lineSegments>` quedan con matriz identidad; `uPoseA`/`uPoseB` son las
   matrices de anclaje de las dos cajas. Elimina por construcción la clase de
   bugs de "matriz de mundo desactualizada un frame".
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
| high | ancho ≥1024 y ≥8 cores | `lod2` | 128 | 16 384 | 2 | sí |
| medium | ancho ≥768 y ≥4 cores | `lod2` | 128 | 16 384 | 1.5 | sí |
| low | resto (mobile) | `mobile` | 80 | 6 400 | 1 | no |
| sin WebGL2 / degradado | — | — | — | 0 (poster) | — | — |

### 5.1 Cada particula es un punto; las "redes de superficie" son la segunda geometria

> **Origen tecnico:** la primera version de esta seccion (2026-09-11) describia
> un `InstancedMesh` de mallas piramidales de 48 caras por particula, ingenieria
> inversa del sitio dala.craftedbygc.com. Se probo, se uso varias secciones, y
> se abandono el 2026-09-14 a pedido explicito del dueno del proyecto: el plan
> `docs/qa/plan-particulas-nitidas-scroll.md` pedia "puntos distinguibles y
> silueta estable... sin textura de esquirlas" y "lineas discretas que expliquen
> la superficie sin competir con el contorno" -- lo opuesto de una malla solida
> por particula. Ver la decision en `09-registro-decisiones.md` del vault.

Cada particula es un **punto GL** (`gl_PointSize` calculado en el vertex
shader, disco antialiasado en el fragment via `gl_PointCoord`), no una malla.
Sobre la misma nube se dibujan ademas **dos `LineSegments`** -- las "redes de
superficie" -- con lineas cortas entre particulas vecinas de la MISMA pieza:

- **Horneado** (`assets-source/tools/surface_structure.py`, funcion
  `surface_links`): para cada particula, busca vecinas dentro de un radio fijo
  (`0.065` en `lod2`, `0.10` en `mobile`) usando un hash espacial por celdas
  (no busqueda O(N^2)), y solo conecta pares que (a) pertenecen al mismo
  **componente** (mismo objeto de origen -- evita puentes entre piezas
  separadas), (b) tienen normales alineadas (`dot > 0.80`, evita atravesar
  superficies curvas o caras opuestas) y (c) quedan cerca del plano tangente
  (`< 0.30` de la distancia, evita cuerdas). Grado acotado a 4 por particula.
  Sale como `<forma>-links-<lod>.bin`: `Uint32Array` de pares `(a, b)`
  consecutivos -- cada par es un segmento de linea.
- **Runtime**: `shapeLoader.ts` (`loadShapeLinks`) valida el tamano del buffer
  contra `linkCount` del manifest y que ningun indice exceda `count`.
  `ParticleCloud.tsx` mantiene 2 geometrias `LineSegments` compartidas (una por
  punta del morph activo) cuyo atributo `particleIndex` son esos mismos
  indices; el vertex shader las mueve con el MISMO calculo de posicion que los
  puntos (`#ifdef SURFACE_LINES` solo cambia de donde sale el indice de
  particula). Cada red aparece al llegar a su forma y desaparece al salir
  (`vNetwork`, una rampa sobre `uT`), asi que nunca se ven las lineas de una
  forma estirandose a mitad de un viaje largo.

**El muestreo de superficie es una reticula determinista, no aleatorio
ponderado.** `assets-source/tools/surface_structure.py` (`lattice_surface`)
reparte la cuota de particulas por triangulo proporcional a su area (con los
pesos cuantizados a 8 decimales para que los pares `pairWith` -- `nodo` /
`nodo-explotado` -- sigan siendo numericamente identicos), y dentro de cada
triangulo las coloca en una **reticula regular** (filas paralelas al lado mas
largo, separacion aproximadamente uniforme) en vez de tirar puntos al azar con
baricentricas aleatorias. Es lo que hace que la superficie se lea como una
malla ordenada y no como ruido -- reemplaza a `sample_surface` (aleatorio +
`RandomState`), que sigue existiendo en el archivo (con su propio test) pero ya
no la llama `build_shape`.

`edgeBoost` (sesgo de densidad hacia aristas vivas, calculado en
`sharp_edges`) sigue implementado pero esta en `0` en `shapes.json`: con
`lattice_surface` la reticula regular por si sola ya da una lectura de
superficie ordenada, y el sesgo adicional no se echo en falta. Si se
reactiva, corrige un bug de 2026-09-14: `weights` se recalculaba dos veces y
la segunda pisaba a la primera con areas puras, asi que subir `edgeBoost`
antes de esa fecha no habria cambiado nada -- hoy si funciona.

**El tamano de cada particula se sigue horneando, no calculando en vivo** --
eso no cambio respecto al InstancedMesh. Nuestro campo de detalle, horneado en
`bake_positions.py`, es el **menor entre dos medidas**: la distancia a una
arista viva (`sharp_edges`, dos caras a mas de 28 grados o borde abierto) y el
**grosor local** del solido bajo el punto (un rayo hacia el interior contra el
BVH de la malla, `local_thickness`). Solo la distancia a arista falla en
piezas curvas sin aristas -- una esfera lisa (los chorros de agua de
`riego.glb`) "no tiene borde cerca" y se llevaba las particulas mas grandes
del modelo; el grosor corrige eso. El resultado se normaliza por **percentiles
de la propia forma** (p8-p92, no una fraccion fija del bounding box) para que
una forma compuesta de piezas de tamanos muy distintos (como era la fila
de tres piezas de Capacidades antes del carrusel: 10.9 de ancho total, piezas
de ~2) use todo el rango de tamano en vez de quedar entera del lado chico.

Se hornea el factor (canal A de la textura de parametros `<forma>-params-<lod>.bin`,
junto al color en RGB), no el tamano final, asi el rango (`edgeScale`/
`faceScale` en `cloudTokens.ts`) se ajusta sin volver a hornear. El vertex
shader tambien suma un jitter de tamano por semilla (`uSizeJitter`) para que
particulas vecinas con el mismo `detail` no salgan todas identicas.

A eso se suma la profundidad, medida contra el centro del morph (interpolado
entre los centros de las dos poses, no un centro fijo) en espacio de vista: el
`gl_PointSize` final se recorta a `[1.35, 3.2]` px y el fragment atenua alpha
hacia atras (`vFade`, con piso `backAlpha`) para separar visualmente el frente
del fondo sin luces.

### 5.2 La transicion: scrubbeada, con desfase por particula ordenado espacialmente

El scroll **es** la linea de tiempo (`motion.tramoModo: 'scrub'`,
`ScrollTrigger` con `scrub: true` -- sin lerp numerico, la posicion de scroll
fija el progreso de forma directa). Parar de scrollear conserva exactamente el
estado (forma, dispersion); recargar la pagina en la misma posicion reproduce
el mismo estado; retroceder deshace la misma transicion. Verificado en
`e2e/scene-scroll-direct.spec.ts`.

Dentro de un tramo, cada particula sigue teniendo su propio desfase
(`uStagger`) para que la transformacion se lea como algo que barre el
enjambre en vez de un bloque que se traslada -- pero el rango de ese desfase
(`rank`, en `cloud.vert.ts`) ya no sale de una semilla aleatoria: se calcula
proyectando la posicion horneada de la particula sobre `uSweepDir` (la
direccion de barrido declarada por tramo en `sequence.ts`, p. ej. "arriba->
abajo" para logo->nodo), normalizada al ancho real de la forma sobre ese eje
(`uSweepScale`, evita que un eje corto de la forma aplaste el rango contra el
centro). `uSweepJitter` mezcla ese rango ordenado con la semilla en la
proporcion que se quiera (hoy bajo, para que el frente no sea una guillotina
perfecta).

Los tramos `morphEnSitio` y `apagado` pasan `uRigid: 1`: ahi no hay
desplazamiento entre cajas distintas, asi que el desfase y la respiracion
(`uSpread`) se desactivan y el morph es un mix directo A<->B -- correcto
cuando la forma B es la MISMA pieza reordenada (`nodo-explotado` -> `nodo`,
`pairWith`: el indice i es la misma pieza fisica en las dos) o un apagado
(la alpha ya se esta yendo a 0, no importa el camino).

**Excepcion: `stagger: true` por tramo** (sequence.ts), usada por el carrusel
de Capacidades (riego -> seguridad -> hogar). Esas formas NO tienen relacion
fisica entre si (no hay `pairWith`), asi que el indice i de una NO es la
misma pieza fisica en la otra -- un mix directo A<->B se ve como una doble
exposicion borrosa: las dos nubes promediadas a la vez, con huecos donde sus
densidades no coinciden (verificado en captura, 2026-09-14). Con
`stagger: true` el tramo prende: el mismo barrido dirigido que un `viaje`
(`uStagger`), la respiracion (`uSpread`) y un curl + una caida de alpha a
mitad de camino MUY por debajo de los de vuelo (`cloudTokens.enSitio`: curl
~40% y dip ~60% de los de `viaje`) -- lo suficiente para que el tramo medio
se lea como un enjambre disperso en transito en vez de ruido, sin que se
sienta "volando" (no hay caja de destino distinta). El swirl (orbita de
vuelo) sigue apagado: no tiene eje que orbitar sin desplazamiento entre
cajas.

Por que 16 384 particulas (`lod2`) y no las 150k-250k que sugeria el estandar
semilla: esta nube **convive con texto** en cajas de ~360 px y con una Central
solida, no ocupa un hero a pantalla completa. La red baja de paso: ~66 KB por
forma en desktop (posiciones `S=128` half-float RGBA) + ~64 KB de parametros +
un tamano variable de enlaces (las redes de superficie rondan 250 KB por forma
en `lod2`, dominadas por el propio array de indices, no por las posiciones),
con solo dos formas cargadas al inicio (tramo 0) y una mas por anticipado por
tramo.


## 6. Pipeline de assets

### 6.1 Fuentes

Mallas en Blender, exportadas a GLB a `assets-source/models/<escena>/`. No hace
falta remesh ni decimate: el horneado **muestrea la superficie por área**, no
los vértices, así que la densidad de la malla no determina la distribución.

### 6.2 Definición declarativa — `assets-source/tools/shapes.json`

Las nueve formas (`logo`, `nodo`, `nodo-explotado`, `set`, `riego`,
`seguridad`, `hogar`, `wifi`, `microchip`), sus fuentes GLB, y por forma: `offset`/`scale`/`yaw`/
`pitch`/`exclude` por fuente, `explode` (desplazamiento por **nombre exacto de
malla**), `flatten`, `shell`, `pairWith`, `colors` (material → hex, hornea una
textura de color por partícula), `edgeBoost` (sesgo de densidad hacia aristas
vivas; global u override por forma, hoy en `0`). Global: `seed`, `lods`
(`lod2`: 128 → 16 384 partículas, `mobile`: 80 → 6 400), `outDir`.

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
   `max_dim`, yaw, offset, pitch) y el `explode` por nombre exacto.
2. **Muestrea** `S·S` puntos sobre los triángulos con `lattice_surface`
   (`surface_structure.py`): la cuota de puntos por triángulo es proporcional
   a su **área en espacio de mundo** — no `f.calc_area()`, que es el área
   local e ignora la escala del objeto (con ese bug, `Chassis_ClipTab`, un
   cubo unitario con escala de objeto minúscula, se llevaba el 98 % de las
   partículas) — pero dentro de cada triángulo los puntos se colocan en una
   **retícula regular**, no con baricéntricas al azar (ver §5.1). Excepción:
   los materiales listados en `scatter` (hoy los rayos y la llama del logo,
   en `riego` las gotas, el metal torneado y los tallos, y `hogar` entera)
   se reparten con `even_surface` — candidatos al azar por área raleados por
   muestreo del punto más lejano: espaciado parejo sin filas —, con cuota
   proporcional a su área para no cambiar la densidad. En cápsulas finas y
   conos torneados los triángulos largos dan la vuelta a la pieza y las filas
   de la retícula se leían como aros. `density` (< 1, hoy `riego` en 0.10 y
   `hogar` en 0.30) hornea esa fracción de posiciones DISTINTAS y apila las partículas
   sobrantes exactamente encima: el conteo `S·S` no cambia (el morph empareja
   índices entre formas), pero en reposo se ven menos puntos, más separados.
   Es para formas que se ven chicas en pantalla — en la caja de 310×280 de
   Capacidades el riego mide ~300×100 px y con 16 384 posiciones los puntos
   (~1.5 px) quedaban más juntos que su tamaño y se fundían en una imagen
   plana. `visibleFrom` (dirección hacia la cámara en espacio Blender, hoy
   sólo `hogar` con `[0, -1, 0]`) filtra los candidatos de `even_surface`:
   descarta los de caras que miran hacia atrás y los tapados por otra parte
   del modelo (rayo contra el BVH de la malla hacia la cámara). La nube no
   tiene oclusión entre partículas, así que en una forma que se mira siempre
   de frente lo de atrás se transparenta — en la casa (el ícono extruido), la
   cara de atrás emborronaba el borde del hueco de la puerta. Opcionalmente
   empuja hacia adentro (`shell`) para dar volumen; hoy en `0` para todas las
   formas.
2b. **Nivel de animación** (canal `w`, ver §7 "Puntero y llama"): las
   partículas de materiales `animate` reciben nivel 4; con `animateRamp`
   (`ramp_levels`, sólo el logo) el nivel sale de su alto dentro de esa región
   — 0 desde arriba hasta `from` (0.3), y de ahí sube con curva de raíz hasta
   4 en el punto más bajo. La llama del logo es la malla del GLB, muestreada
   igual que el resto del modelo. (El 2026-09-14 se probó y se descartó una
   llama procedural en volumen: el dueño la vio "desentonada con la forma de
   los demás modelos".)
3. **Detalle por partícula**: `sharp_edges` (aristas vivas, ≥28° entre
   normales o borde abierto) + `local_thickness` (rayo hacia adentro contra el
   BVH) dan, para cada punto muestreado, el menor de los dos, normalizado por
   percentiles de la propia forma — va al canal A de `<forma>-params-<lod>.bin`
   (RGB = color por material, si la forma declara `colors`).
4. **Ejes**: el importador glTF de Blender convierte Y-up → Z-up. Las formas
   sólidas vuelven a Y-up con `blender_to_yup()` (Blender `(x,y,z)` → glTF
   `(x, z, −y)`); sin esa vuelta el eje alto del asset queda en la profundidad
   de la escena y la Central se ve acostada en su caja.
4b. **Inclinación** (`roll`, radianes, convención three — negativo = horario):
   gira la forma ENTERA (todas sus fuentes, y sus normales) sobre el eje
   de la vista, antes de normalizar, así el encuadre `[-1, 1]` sale del
   contorno ya inclinado. El logo usa `-0.6` (la punta de la ampolleta hacia
   la derecha, como en la imagen de referencia del dueño del proyecto). Va en
   el horneado y no como pose de runtime para que el encuadre sea exacto.
5. **Aplanado** (`flatten: true` — ninguna forma lo usa hoy; el logo lo tuvo
   hasta 2026-09-14 y pasó a volumen real): proyección PCA al plano de mejor
   ajuste con **la regla del "arriba" del asset** — la normal es el eje de
   menor varianza (con signo fijado por el frente), el eje Y sale de proyectar
   el "arriba" del asset (+Z en Blender) sobre ese plano, y X = Y × N. **No** se
   toma el eje de mayor varianza como X: eso giraba el logo 90° dentro de la
   pantalla.
6. **Normaliza** a `[-1, 1]` por el eje mayor (de ahí `maxDim = 2` en runtime).
7. **Ordena por curva de Hilbert 3D** (Skilling; 8 bits en `lod2`, 6 en
   `mobile`) — aplicado a las posiciones y, en el mismo orden, a normales,
   componente, color, canal de detalle y nivel de animación. Es diseño, no optimización: vecinos
   en A son vecinos en B, así el morph fluye en vez de explotar.
8. **Pares** (`pairWith`): `nodo` y `nodo-explotado` comparten `rng`, así que
   comparten triángulos y baricéntricas; ambos se generan **sin** reorden
   Hilbert propio — comparten la permutación de la forma base — para que el
   índice `i` sea la misma pieza física en las dos formas.
9. **Semilla**: `mulberry32` determinista por índice desde la `seed` global,
   idéntica en todas las formas de un LOD (va en el canal alpha de
   `positions`). La semilla por forma usa `zlib.crc32(nombre)`, no `hash()` de
   Python (salteado por proceso, rompería la reproducibilidad).
10. **Redes de superficie**: con las posiciones ya normalizadas y ordenadas,
    `surface_links` (§5.1) conecta cada partícula con hasta 4 vecinas del
    mismo componente, mismo lado (normales alineadas) y cerca del plano
    tangente — sale como `<forma>-links-<lod>.bin`.

Salida en `public/textures/particulas/`:

- **`<forma>-positions-<lod>.bin`** — `Uint16Array` de `S·S·4` half-floats,
  fila-mayor, `(x, y, z, w)` con `w = (nivel + semilla) / 2` — ver §7, "Puntero
  y llama". 128 KB (`lod2`, S=128) / 50 KB (`mobile`, S=80).
- **`<forma>-positions-<lod>.json`** — `{ shape, lod, size, count, bbox,
  sources, params, hasColor, links, linkCount, structure, generatedAt }`.
- **`<forma>-params-<lod>.bin`** — `Uint8Array` RGBA, mismo índice de píxel
  que `positions`: RGB = color por material (blanco si la forma no declara
  `colors`), A = detalle normalizado [0,1].
- **`<forma>-links-<lod>.bin`** — `Uint32Array` de pares de índices
  consecutivos (cada par = un segmento).

En runtime, `shapeLoader.ts` valida `byteLength === size·size·8` para
`positions`/`params` y arma un `DataTexture(RGBAFormat, HalfFloatType /
UnsignedByteType, NearestFilter, flipY:false)`; para `links`, valida
`byteLength === linkCount·8` y que ningún índice exceda `count`.

### 6.4 Manifest — `scripts/write-manifest.mjs`

```bash
npm run manifest
```

Recorre los `.json` horneados y escribe `public/scene-manifest.json`:
`{ shapes: { <forma>: { lod2 | mobile: { file, size, count, bbox,
params?, hasColor?, links?, linkCount?, structure? } } }, sequence, tiers:
{ high: 'lod2', medium: 'lod2', low: 'mobile' }, generatedAt }`. Los cuatro
campos opcionales sólo aparecen si el `.json` horneado los trae (`params`
desde 2026-09-11, `links`/`linkCount`/`structure` desde 2026-09-14; toda forma
horneada hoy trae los cuatro). **Se regenera después de cada horneado.**

### 6.5 Poster — `assets-source/tools/render-poster.py`

```bash
blender -b --python assets-source/tools/render-poster.py
```

Render Eevee ortográfico y de frente de `logo-lod1.glb` (la ampolleta, con los
mismos colores por material que `shapes.json`, emisivos) a
`public/posters/logo.webp`. Es el fallback del Hero: vive en el DOM dentro de
`.hero__anchor`, no en la capa fija.

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
cualquier tramo, `pointermove` sobre el Hero, `scroll`/`resize`/`pageshow`
(estos tres, agregados 2026-09-14, en `SceneTicker` — sin ellos un morph en
reposo no seguía a su ancla del DOM si la página scrolleaba sin cambiar el
progreso del tramo, y la Central del Hero podía quedar invisible al llegar por
scroll sin mover después el puntero), carga de forma, crossfade de
reduced-motion. `SceneTicker` renderiza mientras haya dirty y `graceMs` (1 s)
después de la última marca. Con `scrub: true` (sin lerp numérico) ya no hay
"asentamiento" de scrub que esperar — el `graceMs` cubre otras colas (curl
apagándose, reveals). **Desde el 2026-09-14 ya no hay 0 frames en reposo
mientras un modelo esté en pantalla**: la "vida" de las partículas (la
respiración, ver "Vida en reposo" más abajo) pide frames seguidos. Con
reduced-motion la vida se apaga y vuelve el reposo real: 0 frames
(verificado: `registry.lastDirtyAt()` queda >3 s atrás con la escena quieta).

**Registry / slots / proveedores de pose.** Una sección declara su caja:

```tsx
useSceneSlot({ id: 'problema', anchorRef: ref, fit: 0.72, pose: 'tresCuartos', surface: 'light' });
```

`fit` es fracción del **lado menor** de la caja, así nada desborda en anchos
intermedios — cada sección calibra el suyo contra su propia caja y la
proporción de su forma (hoy: `problema` 1.04, `solucion` 1.0, `capacidades`
0.95–1.05 según ancho con pose `frontal` — riego y seguridad son planos —,
`valor` 1.26, `proceso` 0.86, `contacto-microchip` 0.95, `hero-display` 1.0
— son valores de ajuste visual, no una convención fija, y cambian cuando
cambia la forma horneada de esa caja). Desde el 2026-09-14 el Hero también es
un slot sobre `.hero__anchor` (antes registraba un **proveedor de pose**,
`registerPoseProvider('hero-display')`, con la matriz de la pantalla de la
Central sólida; el mecanismo sigue en `registry` por si vuelve a hacer falta).
**Parallax en todos los modelos** (desde 2026-09-14; antes sólo el Hero):
ParticleCloud aplica sobre la pose de cada slot un yaw/pitch amortiguado por
el puntero (`motion.parallax.amount` 0.22 rad de yaw, el pitch es la mitad;
`motion.parallax.damping`), que el origen de un viaje pierde y el destino
gana con `t`. Un slot puede pisar el giro con su propio `parallax` (0 lo
apaga). Sólo con puntero fino y sin reduced-motion. Los scrubs de tramo se montan en un componente propio
**después** de las secciones, para que todos los slots ya estén registrados.

**Puntero y llama (2026-09-14).** Dos movimientos que no son función del
scroll, ambos en el vertex shader y acotados: (1) en un área chica alrededor
del cursor (`cloudTokens.pointer.radius` 0.16 del span), las partículas de
cualquier modelo se **levantan** un poco hacia la cámara (+Z, `lift` 0.08 del
span), **crecen** (`grow` +35 % de tamaño de punto, que es lo que hace legible
la elevación con la cámara a 10 unidades) y se **aclaran a blanco** (`white`
0.9, en el fragment vía `vHighlight`). No hay desplazamiento en el plano de
pantalla: la silueta no se deforma. Reemplaza al empuje radial anterior
(2026-09-14, rechazado por el dueño: "no me gusta la deformación"). La
posición del puntero llega amortiguada desde ParticleCloud
(`anchorToWorldXY` en z = 0), sólo con puntero fino y sin reduced-motion. (2) Las partículas con **nivel de
animación** horneado (0 quieta .. 4 máximo; la llama del logo, §6.3 paso 2b)
**no se mueven: parpadean.** Cada una baja su alpha con un pulso ralo
(`pow(.5 + .5·sin, 4)`: casi siempre encendida, se apaga de a ratos), a su
propio ritmo por semilla (`cloudTokens.flame.blinkRate` 1.4 rad/s × 0.6..1.4,
ciclos de ~3–7 s) y con profundidad `blink` (0.9) × nivel/4. El parpadeo va
por `vFade`, así que también atenúa las líneas de red que tocan esas
partículas. La llama queda sólida como el resto del modelo — antes se probó
desplazarla con curl, y el dueño pidió dejarla como viene y que sólo
parpadeen las partículas de abajo. (Un prendido/apagado completo de las puntas
de las lenguas y las chispas se probó el 2026-09-14 y el dueño lo descartó.)
Mientras una forma
animada está a la vista la nube pide frames seguidos (`registry.markDirty`
por frame). El
nivel viaja en el canal `w` de la textura de posiciones: `w = (nivel +
semilla) / 2`, el shader lee `seed = fract(w * 2)` y `nivel = floor(w * 2)`.
La semilla se acota a 0.996 al hornear: en half float una semilla más cerca
de 1 redondea al nivel siguiente.

**Vida en reposo (2026-09-14).** Pedido del dueño ("darle vida a las
partículas"). Queda sólo la **respiración**: `uSpread` suma
`breatheAmp · sin(t · breatheFreq · 2π)` (1.2 %, ciclo de 5 s) a la
respiración de tramo que ya existía, en TODA forma, en reposo y en tramo
(`cloudTokens.life`). No toca el shader: `uSpread` ya abre y cierra las
partículas alrededor del centro. Apagada con reduced-motion; mientras corre,
la nube pide frames seguidos con el modelo visible. (Unos destellos
aleatorios — partículas que se aclaraban con halo de a ratos — se probaron
junto a la respiración y el dueño los descartó el mismo día.)

**Scissor de corredor — la nube nunca dibuja sobre texto.** La capa está en
z 5 (sobre el contenido, bajo el header en z 20): los fondos de sección son
opacos, así que ponerla debajo la haría invisible. La garantía de "nunca sobre
texto" la da el renderer, no el z-order: en `onBeforeRender` (compartido por
los puntos y las dos redes de superficie) la nube activa `setScissorTest` con
`corridorRect(rectA, rectB, t, stagger, 0.32, viewport)` — la unión de las dos
cajas interpoladas a lo largo del camino A→B en el progreso mínimo y máximo
del enjambre (el mismo `smoothstep` con stagger del vertex shader), más 32 %
de margen (subió de 20 % al agregar el barrido dirigido — ver §5.2 — que
dispersa la nube más lejos del eje recto A→B). En reposo es la caja; en vuelo
es un corredor que sigue al enjambre, no la pantalla entera. Además la alpha
baja a mitad del viaje (`×(1 − 0.25·sin πt)`, `cloudTokens.travelDip`).
`setScissor` recibe **píxeles CSS con origen abajo-izquierda**; three aplica
el dpr internamente.

**Elementos de texto protegidos, además del scissor.** Cada partícula/línea
que cae sobre una caja de texto marcada (`header, h1, h2, p, ul, ol,
.capacidades__card h3, form, .scene-caption` — recolectadas una vez al montar
`ParticleCloud`, hasta 24 cajas, en coordenadas de framebuffer; nunca un
wrapper que contenga una caja de escena: proteger `.capacidades__card` entera
descartaba el modelo del carrusel)
se descarta en el fragment shader (`uProtected[24]`, `discard`). Es una
segunda defensa, no un reemplazo del scissor: cubre el caso de partículas que
SÍ están dentro del corredor recortado pero caen justo sobre una línea de
texto de la propia sección (el scissor recorta un rectángulo grande; esto
recorta las cajas de texto puntuales dentro de él).

**Nunca `setState` de React dentro de `useFrame`** — mutar uniforms y refs.

**Nunca un reveal (tween de opacidad/traslación del DOM) sobre una caja de
escena ni sobre un ancestro suyo.** La nube lee el rect de la caja por frame:
si la caja se desliza 22 px con el reveal de la sección, el modelo queda
rezagado detrás de ella al entrar. `useSectionReveals` excluye las cajas y sus
contenedores (`SKIP`) y `useSectionReveals.test.tsx` lo verifica renderizando
las secciones — agregar ahí cualquier sección nueva con caja.

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
no al montar, y es lo que vuelve transparentes las cajas-escenario y revela
las que sin escena van ocultas (la de la tarjeta de Capacidades, la `.visual`
de Contacto); como ese cambio mueve el layout, el host hace
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
- [ ] `npm test` — vitest: `anchoring`, `sequence.resolveTramo`, `sweep`
      (rango/escala del barrido, independiente de progreso y de pose),
      `registry`, `frameBudget`, `deviceTier`, `webglSupport`,
      `pageCameraMath`, `scissor`, `shapeLoader` / `useShapeTextures`
      (incluye `loadShapeLinks`), shaders, `SceneTicker`,
      `scrollTrigger.createScrub` (scrub directo, `scrub: true`), smoke r3f de
      `ParticleCloud` (monta puntos + 2 `LineSegments`, sin mallas por
      partícula)
- [ ] `npm run build` limpio
- [ ] `npm run lint` (oxlint) sin errores
- [ ] `npm run e2e` (Playwright, Chromium, dev server en **5199**):
      tramos avanzan con el scroll, **scroll directo — pausa e inversión**
      (`scene-scroll-direct.spec.ts`: el progreso no sigue moviéndose tras
      soltar el scroll, y una recarga en la misma posición reproduce el mismo
      estado), reduced-motion cuantiza, `?no3d` muestra poster + placeholders,
      mobile sin desborde horizontal, el guard degrada
- [ ] Tests del horneado, dos suites:
      - `blender -b --python assets-source/tools/test_bake_positions.py`
        (localidad Hilbert, misma semilla por índice, roundtrip half-float,
        regla del "arriba" del asset en `flatten`, área en espacio de mundo,
        vuelta a Y-up de las formas sólidas, orden de Hilbert compartido por
        un par `pairWith` y su base, `exclude`, `pitch`). **Bajo Blender, no
        bajo `python` a secas**: varios tests importan `bpy` (y el del par
        hornea de verdad `nodo` / `nodo-explotado`), y `bake_positions.py` lo
        importa en su primera línea, así que ni siquiera se puede importar el
        módulo fuera de Blender.
      - `python -m unittest test_surface_structure` desde
        `assets-source/tools/` (retícula conserva conteo e identidad bajo
        traslación, piezas chicas muy teseladas conservan su cuota de área,
        los enlaces respetan componente/distancia/grado, no cruzan superficies
        opuestas). Éstos SÍ corren con `python` a secas — `surface_structure.py`
        no importa `bpy`.

Puertas manuales:

- [ ] `public/scene-manifest.json` regenerado (`npm run manifest`) tras cada horneado
- [ ] Ningún `setState` dentro de `useFrame`
- [ ] Los tres tiers probados en dispositivo real, no solo emulación (T16 abierta)
- [ ] `prefers-reduced-motion` verificado a mano
- [ ] Capturas por tramo revisadas (`docs/qa/v2/`)
- [ ] Nombres de archivo según §6.6
