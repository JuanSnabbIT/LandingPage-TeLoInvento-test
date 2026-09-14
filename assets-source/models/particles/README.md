# Material de partículas del dueño del proyecto — archivado, nada de esto se usa hoy

Carpeta que entregó el dueño del proyecto el 2026-09-11 ("una carpeta de
partículas para que las uses de base de las mallas volumétricas"). Hasta el
2026-09-14 los `py-*.glb` sí se usaban (ver más abajo); desde esa fecha **nada
de lo que hay acá alimenta el pipeline en producción**. Se conserva por si se
retoma el enfoque de partícula-como-malla.

## `py-lod1.glb` / `py-lod2.glb` / `py-lod3.glb` / `py-lod7.glb` / `py-monbile.glb`

Sólidos de ~48 caras, uno por partícula (salvo `py-monbile.glb`, un anillo
triangular plano de 6 vértices, pensado para billboard). Entre el
2026-09-11 y el 2026-09-14 la nube los dibujaba con `InstancedMesh`
(`py-lod1.glb` en escritorio, `py-lod7.glb` en teléfono) desde `public/particles/`.

El 2026-09-14, a pedido explícito del dueño del proyecto (la malla sólida por
partícula se leía como "esquirlas", no como superficie — ver
`docs/qa/plan-particulas-nitidas-scroll.md`), la nube volvió a `GL_POINTS`
(`gl_PointSize` calculado en el shader) más dos `LineSegments` de "redes de
superficie" horneadas por `assets-source/tools/surface_structure.py`. Ningún
código de runtime los referencia ya; se movieron de `public/particles/` acá
para que Vite deje de copiarlos a `dist/` en cada build.

Detalle completo del sistema actual: `docs/architecture/3d-web-standard.md`
§5.1; la decisión de abandonar `InstancedMesh`, en `09-registro-decisiones.md`
del vault (2026-09-14).

## `targets.bin`

Binario propio, con cabecera `TLIP`, versión 1, 14 000 partículas y 5
destinos. Viene de otro proyecto del dueño (las mallas traen rastros de un
`Brain_animation` de Houdini). Nuestro pipeline calcula los destinos con el
horneado propio (`assets-source/tools/bake_positions.py` →
`public/textures/particulas/`), así que este archivo no se lee en ningún lado
y nunca se usó. Si más adelante se quiere usar ese formato, hay que escribirle
un lector.
