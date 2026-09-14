# CLAUDE.md — TeLoInvento Landing

Landing page de promoción para TeLoInvento (sets IoT de riego y seguridad
perimetral). Proyecto de marketing independiente del monorepo principal de
TeLoInvento — no comparte stack ni identidad visual con `frontend_v3`.

## SSOT — la documentación NO vive en este repo

Todo el negocio, spec, decisiones y estado de tareas vive en un vault
Obsidian separado:

**`C:\Docs-TeLoInvento-Landing\`** — empezar siempre por su `README.md`.

Documentos clave:
- `00-contexto-negocio.md` — qué se vende, a quién, cómo
- `03-SDD.md` — spec funcional (9 secciones del landing)
- `04-BDD.md` — criterios de aceptación
- `06-direccion-visual.md` — paleta/tipografía **decididas**
- `07-arquitectura-tecnica-motion.md` — patrones r3f/GSAP
- `08-TBB-orquestador-tareas.md` — grafo de tareas, estado y qué sigue
- `09-registro-decisiones.md` — decisiones cerradas/abiertas (bitácora viva)
- `10-skills-y-agentes.md` — qué skill/agente invocar para cada tipo de tarea
- `11-auditoria-3d-motion.md` — auditoría de la escena v1 y su estado tras el refactor (§6)
- `13-spec-diseno-nube.md` — spec de la escena v2; sus desviaciones reales, en §15

No hay MCP de Obsidian conectado — el vault es una carpeta de archivos
markdown, se lee/escribe directo, sin herramienta especial. **Para
registrar o consultar decisiones de arquitectura usar el skill
`adr-obsidian`** en vez de editar `09-registro-decisiones.md` a mano — su
descripción referencia explícitamente este mismo patrón de vault.

## Estado actual (2026-09-14)

- Dirección visual **decidida y validada**: réplica fiel de una maqueta
  hecha en Relume por el dueño del proyecto (paleta `#5479E1` / `#809BE9`,
  Inter, 9 secciones alternando fondo claro/oscuro) — **no** los colores
  del logo oficial (`#F5A623`/`#2B95C3`/`#0D3559`). Ver `06-direccion-visual.md`.
- Maqueta HTML/CSS de referencia aprobada en **`reference/maqueta-aprobada.html`**
  (solo lectura, no se modifica). Las 9 secciones están portadas a React en
  `src/sections/` (T10).
- **La escena v3 ("la nube") es la única escena.** Una sola nube de
  puntos (`GL_POINTS`, no mallas instanciadas) recorre la página
  transformándose en nueve formas a lo largo de diez tramos (logo → nodo →
  set → riego ⇄ seguridad ⇄ hogar (carrusel: scroll horizontal fijado en desktop, click en teléfono) → wifi → nodo explotado → nodo →
  microchip → apagado): morph sin estado en el
  vertex shader entre dos texturas de posiciones horneadas (16 384
  partículas en desktop, 6 400 en mobile), más curl solo en vuelo. Sobre esa
  misma nube se dibujan además dos `LineSegments` ("redes de superficie":
  líneas cortas entre partículas vecinas de la MISMA pieza, horneadas por
  `assets-source/tools/surface_structure.py`) que aparecen al llegar a una
  forma y desaparecen al salir de ella — es lo que da la lectura de
  superficie ordenada en vez de nube difusa. Sin GPGPU, sin mallas de
  partícula por instancia (el enfoque `InstancedMesh` de pirámides se probó
  y se abandonó — ver `09-registro-decisiones.md` del vault, 2026-09-14).
  Detalle completo en `docs/architecture/3d-web-standard.md`.
- **El scroll SCRUBBEA la transición, no la dispara** (`motion.tramoModo:
  'scrub'`, `scrub: true` — GSAP sin lerp numérico: la posición de scroll ES
  el progreso, sin retraso). Parar de scrollear conserva el estado exacto
  (forma, dispersión, conexiones); retroceder deshace la misma transición.
  Es el pedido explícito del dueño del proyecto (2026-09-14, ver
  `docs/qa/plan-particulas-nitidas-scroll.md`) y reemplaza al modo
  `'disparo'` (tween con duración propia disparado al cruzar un umbral,
  inspirado en el sitio Dala) que se probó antes: con disparo, una vez
  arrancada la transición ya no respondía 1:1 al scroll, que es justo lo que
  se pidió cambiar. El código de `'disparo'` (`createTriggerTween`) se dejó
  en `scrollTrigger.ts` por si se retoma, pero no es el modo activo.
- Módulos:
  - `src/scene/` — `PersistentSceneLayer` (capa fija z 5) · `PageSceneHost`
    (poster vs canvas, degradación con TTL) · `PageSceneCanvas`
    (`frameloop="never"`) · `SceneTicker` · `SceneLights` · `scenePalette` ·
    `PageCamera`/`pageCameraMath` · `anchoring` · `registry` ·
    `useSceneSlot` · `deviceTier` · `webglSupport` ·
    `frameBudget`/`FrameBudgetGuard` · `SlotErrorBoundary` · `debug`
  - `src/scene/cloud/` — `ParticleCloud` · `sequence` (TRAMOS +
    `resolveTramo`; `stagger: true` por tramo prende el barrido dirigido en un
    `morphEnSitio` entre formas sin relación física — el carrusel de
    Capacidades, ver `cloudTokens.enSitio`) · `useShapeTextures`/`shapeLoader` ·
    `cloud.vert`/`cloud.frag`/`curl.glsl` · `scissor` · `cloudTokens` ·
    `capacidadesCarousel` (progreso de los tramos manuales riego → seguridad → hogar:
    `setCapacidadesPosition` desde el scroll horizontal de desktop, tween por click en teléfono)
  - El Hero es un slot más (`hero-display` sobre `.hero__anchor`, en
    `Hero.tsx`): texto a la izquierda, el logo en partículas a la derecha, con
    horneado inclinado (`roll`) y la
    llama de la malla sólida cuyas partículas de abajo parpadean (`animate` +
    `animateRamp` en `shapes.json`, nivel en el canal w); rayos y llama se
    muestrean con espaciado parejo (`scatter`) en vez de la retícula. La
    Central sólida (`HeroCentral`, `bestFitPlane`, `glow.*`) se retiró el
    2026-09-14 — `central-v2.glb` sólo alimenta el horneado de `set`. Bajo el
    cursor, en un área chica, las partículas de cualquier modelo se levantan,
    crecen un poco y se aclaran a blanco, sin deformar la silueta (`cloudTokens.pointer`).
    Todos los modelos giran levemente con el puntero (parallax, `motion.parallax`).
    "Vida" en reposo en todos los modelos (`cloudTokens.life`): una
    respiración lenta del modelo. Es continua: con un modelo en pantalla la
    escena ya no queda en 0 frames (salvo con reduced-motion, que la apaga).
  - `src/motion/` — `tokens` · `scrollTrigger` (`createScrub`) ·
    `useTramoScrubs` · `useSectionReveals`
  - Las secciones con nube declaran su caja con `useSceneSlot`
    (Hero, Problema, Solución, Capacidades, Valor, Proceso, Contacto); el CSS de
    escenarios vive en `src/styles/scene.css`. Capacidades va en dos mitades
    (título y bajada a la izquierda, carrusel a la derecha; apiladas en ≤900 px).
    En desktop la sección se fija y el scroll desliza las tarjetas (pin + scrub,
    sin flechas; los puntos llevan el scroll a cada tarjeta); en teléfono es un
    carrusel por click. Tres tarjetas (Riego, Seguridad Perimetral, Set Hogar — próximamente, con
    su lista de espera `HogarWaitlist`) con la caja de escena dentro de la
    tarjeta activa; la tarjeta Set Hogar muestra el placeholder `hogar.glb` (ícono
    de casa extruido, copia de una referencia del dueño)
    (`assets-source/models/hogar/README.md`). Plataforma Central (`microchip`)
    vive en Contacto, bajo el texto de introducción. La sección Hogar de la
    maqueta ya no existe como sección (2026-09-14).
- **T13 hecho en código**: `src/lib/submitLead.ts` envía los leads del
  formulario de contacto y de la lista de espera Hogar a un destino
  configurado por env (`.env.example`); en dev sin env se simula.
- Stack: Vite + React **19.2.8 pineado** + TypeScript + `three` +
  `@react-three/fiber` + `@react-three/drei` + `gsap` + `@gsap/react` +
  `suspend-react`. Sin `leva` (se desinstaló: el debug es `?debug`).
  `npm run build` compila limpio.

### Cómo operar la escena

```bash
# hornear las texturas de posiciones (todas las formas y LODs)
blender -b --python assets-source/tools/bake_positions.py
# una sola forma / LOD
blender -b --python assets-source/tools/bake_positions.py -- --shape nodo --lod mobile
# regenerar public/scene-manifest.json después de hornear  (OBLIGATORIO)
npm run manifest
# poster del Hero (el logo, respaldo sin WebGL) -> public/posters/logo.webp
# dibuja la nube HORNEADA del logo (con su inclinación): correrlo después de hornear
blender -b --python assets-source/tools/render-poster.py

npm test                                        # vitest (unitarios + smoke r3f)
npm run e2e                                     # Playwright; levanta el dev server en 5199
python assets-source/tools/test_bake_positions.py   # tests del horneado (numpy, sin bpy)
cd assets-source/tools && python -m unittest test_surface_structure   # retícula de superficie
npm run lint && npm run build
```

Convención de puerto: el dev server de QA y el `webServer` de Playwright usan
**5199** (`playwright.config.ts` reusa uno que ya esté escuchando ahí).

Flags de URL: `?debug` (markers de ScrollTrigger + `window.__scene`), `?no3d`
(fuerza el poster), `?force3d` (ignora la degradación persistida en
`sessionStorage`), `?debug&budget=1` (fuerza la degradación por frame budget,
lo usa el e2e).

## Pendiente / bloqueado (no resolver acá sin el dueño del proyecto)

- **T8 — Fotografía real de producto**: sin producir. Las cajas de sección
  hoy alojan la nube; donde debía ir foto, sigue el placeholder.
- **Destino real del formulario** (correo o backend) — el código ya está
  listo; falta completar `VITE_LEAD_ENDPOINT` o `VITE_LEAD_FALLBACK_EMAIL`
  en `.env.local`. Bloquea el lanzamiento (T17), no el build.
- **T16 — validación en dispositivo mobile real** (gama media). Emulación
  390×844 verificada; falta el aparato.
- **Decisiones del dueño del proyecto**:
  - "Feel" de los reveals: los tokens cambiaron a 0.5 s / `expo.out` (antes
    0.7 s / `power2.out`) — falta que lo mire.
- Si el sensor de humedad es parte del kit base de Riego o un add-on
  opcional — contradicción entre lo que dice el negocio y el firmware real
  (`kit_riego_espnow/espnow_protocol.h`), pendiente de confirmar con el
  equipo de firmware.

## Reglas

- React pineado a `19.2.8` exacto en `package.json` — no subir a 19.3+ sin
  verificar antes que `@react-three/fiber` ya lo soporte como peer.
- Antes de tocar la escena r3f: usar el skill `webgl-scene-brief` para
  definir el concepto (qué se anima, con qué assets) antes de que el agente
  `webgl-scene-architect` construya nada — ver `10-skills-y-agentes.md` del vault.
- Toda decisión de arquitectura nueva (librería, patrón, esquema) se
  registra en el vault (`adr-obsidian` / `09-registro-decisiones.md`), no
  solo en este repo — el vault es la fuente de verdad, este repo es el código.
- Después de re-hornear formas, correr `npm run manifest`: el runtime lee
  tamaños y rutas del manifest, no del disco.
