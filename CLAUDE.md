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

## Estado actual (2026-09-11)

- Dirección visual **decidida y validada**: réplica fiel de una maqueta
  hecha en Relume por el dueño del proyecto (paleta `#5479E1` / `#809BE9`,
  Inter, 9 secciones alternando fondo claro/oscuro) — **no** los colores
  del logo oficial (`#F5A623`/`#2B95C3`/`#0D3559`). Ver `06-direccion-visual.md`.
- Maqueta HTML/CSS de referencia aprobada en **`reference/maqueta-aprobada.html`**
  (solo lectura, no se modifica). Las 9 secciones están portadas a React en
  `src/sections/` (T10).
- **La escena v2 ("la nube") es la única escena.** Una sola nube de
  partículas recorre la página transformándose en seis formas (logo → nodo →
  set → sensores → central → nodo explotado → nodo) como **función pura del
  scroll**: morph sin estado en el vertex shader entre dos texturas de
  posiciones horneadas, más curl noise solo en vuelo. Sin GPGPU, sin flag de
  migración, sin escena v1. Detalle completo en
  `docs/architecture/3d-web-standard.md`.
- Módulos:
  - `src/scene/` — `PersistentSceneLayer` (capa fija z 5) · `PageSceneHost`
    (poster vs canvas, degradación con TTL) · `PageSceneCanvas`
    (`frameloop="never"`) · `SceneTicker` · `SceneLights` · `scenePalette` ·
    `PageCamera`/`pageCameraMath` · `anchoring` · `registry` ·
    `useSceneSlot` · `deviceTier` · `webglSupport` ·
    `frameBudget`/`FrameBudgetGuard` · `SlotErrorBoundary` · `debug`
  - `src/scene/cloud/` — `ParticleCloud` · `sequence` (TRAMOS +
    `resolveTramo`) · `useShapeTextures`/`shapeLoader` ·
    `cloud.vert`/`cloud.frag`/`curl.glsl` · `scissor` · `cloudTokens`
  - `src/scene/hero-central/` — `HeroCentral` (Central sólida del Hero,
    `central-v2.glb`, provee la pose `hero-display`) · `bestFitPlane` · `glow.*`
  - `src/motion/` — `tokens` · `scrollTrigger` (`createScrub`) ·
    `useTramoScrubs` · `useSectionReveals`
  - Las secciones con nube declaran su caja con `useSceneSlot`
    (Problema, Solución, Capacidades, Valor, Proceso); el CSS de escenarios
    vive en `src/styles/scene.css`.
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
# poster del Hero
blender -b --python assets-source/tools/render-poster.py

npm test                                        # vitest (unitarios + smoke r3f)
npm run e2e                                     # Playwright; levanta el dev server en 5199
python assets-source/tools/test_bake_positions.py   # tests del horneado (numpy, sin bpy)
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
  - Franja `.capacidades__stage`: ubicación y alto. Hoy va **encima** de las
    tarjetas (220 px desktop / 160 px ≤900 px) y queda ~75 % vacía; además el
    corredor del tramo 3 pasa tenue sobre la tarjeta del medio. Alternativa:
    bajarla debajo de las tarjetas.
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
