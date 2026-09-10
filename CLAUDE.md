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
- `07-arquitectura-tecnica-motion.md` — patrones r3f/GSAP a validar en el spike técnico
- `08-TBB-orquestador-tareas.md` — grafo de tareas, estado y qué sigue
- `09-registro-decisiones.md` — decisiones cerradas/abiertas (bitácora viva)
- `10-skills-y-agentes.md` — qué skill/agente invocar para cada tipo de tarea

No hay MCP de Obsidian conectado — el vault es una carpeta de archivos
markdown, se lee/escribe directo, sin herramienta especial. **Para
registrar o consultar decisiones de arquitectura usar el skill
`adr-obsidian`** en vez de editar `09-registro-decisiones.md` a mano — su
descripción referencia explícitamente este mismo patrón de vault.

## Estado actual (2026-09-09)

- Dirección visual **decidida y validada**: réplica fiel de una maqueta
  hecha en Relume por el dueño del proyecto (paleta `#5479E1` / `#809BE9`,
  Inter, 9 secciones alternando fondo claro/oscuro) — **no** los colores
  del logo oficial (`#F5A623`/`#2B95C3`/`#0D3559`). Ver `06-direccion-visual.md`.
- Maqueta HTML/CSS de referencia de las 9 secciones ya construida y
  aprobada (Hero, Problema, Solución, Capacidades, Hogar-Próximamente,
  Valor de negocio, Cómo trabajamos, Contacto, Footer) — vive en este repo
  en **`reference/maqueta-aprobada.html`**. Abrila directo en el navegador
  para verla; T10 es portar esto a componentes React, no rehacerla.
- Scaffold técnico ya armado en este repo: Vite + React **19.2.8 pineado**
  (exacto, no rango — `@react-three/fiber@9.7.0` todavía no soporta React
  19.3.x) + TypeScript + `three` + `@react-three/fiber` + `@react-three/drei`
  + `gsap` + `@gsap/react`. `npm run build` verificado, compila limpio.
- **Próximo paso:** T9 (spike técnico r3f del objeto "Central") y T10
  (portar la maqueta HTML/CSS a componentes React) — ver
  `08-TBB-orquestador-tareas.md` §5 para el detalle y qué puede correr en paralelo.

## Pendiente / bloqueado (no resolver acá sin el dueño del proyecto)

- Fotografía real de producto — sin producir, la maqueta usa placeholders
  marcados explícitamente ("foto real pendiente de producir").
- Destino real del formulario de contacto (correo o backend) — se deja
  para el final a propósito, no bloquea T9/T10.
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
