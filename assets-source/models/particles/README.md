# Mallas de partícula y `targets.bin`

Carpeta que entregó el dueño del proyecto el 2026-09-11 ("una carpeta de
partículas para que las uses de base de las mallas volumétricas").

## Lo que SÍ usa la web

`public/particles/py-*.glb` — sólidos de ~48 caras, uno por partícula. La nube
los dibuja con `InstancedMesh`: `py-lod1.glb` en escritorio y `py-lod7.glb` en
teléfono (ver `cloudTokens.particleMesh`). Viven en `public/` justamente porque
el navegador los descarga.

## Lo que NO usa

`targets.bin` (2.8 MB) — binario propio, con cabecera `TLIP`, versión 1,
14 000 partículas y 5 destinos. Viene de otro proyecto del dueño (las mallas
traen rastros de un `Brain_animation` de Houdini). Nuestro pipeline calcula los
destinos con el horneado propio (`assets-source/tools/bake_positions.py` →
`public/textures/particulas/`), así que este archivo no se lee en ningún lado.
Se mueve acá desde `public/` para que no se copie al sitio publicado; si más
adelante se quiere usar ese formato, hay que escribirle un lector.
