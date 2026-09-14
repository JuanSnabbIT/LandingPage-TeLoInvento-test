# hogar.glb (placeholder procedural)

Generado el 2026-09-14 con Blender 5.2 headless por `generar_modelo.py`
(mismo directorio). **No es diseño de producto**: es una casa genérica
reconocible (paredes, techo a dos aguas, puerta, dos ventanas, chimenea,
antena con anillos de señal) para que la sección Hogar tenga un visual 3D
mientras no exista el modelo real. Mismo criterio que
`assets-source/models/capacidades/` — cuando el equipo produzca el diseño
real, se reemplaza `hogar.glb` con el mismo nombre y el código no cambia.

Regenerar:

```
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --python assets-source/models/hogar/generar_modelo.py
```

| Pieza (material) | Qué representa |
|---|---|
| `Casa_Muro` | Paredes, cubo único |
| `Casa_Techo` | Techo a dos aguas, prisma con cumbrera en Y |
| `Casa_Puerta` | Puerta frontal, sobresale de la fachada para evitar z-fighting a esta escala |
| `Casa_Ventana` | Dos ventanas laterales (mismo material, mallas `_Izq`/`_Der`) |
| `Casa_Chimenea` | Chimenea, esquina del techo |
| `Casa_Antena` | Mástil de antena, mismo lenguaje visual que `nodo.glb` |
| `Casa_Senal` | Tres anillos (torus) sobre el mástil, señal de "hogar inteligente" |

## Cómo se usa en la página

Forma nueva `hogar` en `assets-source/tools/shapes.json`, horneada por
`bake_positions.py` como el resto de las formas de la nube de partículas
(no es un `AnchoredModel` estático). Slot `useSceneSlot({ id: 'hogar' })`
en `src/sections/Hogar.tsx`.

## Notas técnicas

- Unidades en metros; el horneado normaliza al lado mayor del bbox, así que
  el tamaño absoluto no importa.
- Todas las piezas son mallas separadas con nombre, un material
  (`use_nodes=True`, Principled BSDF) por pieza, sin texturas.
- La puerta y las ventanas sobresalen deliberadamente de la cara de la
  pared (grosor 0.12 en el eje de profundidad) en vez de quedar coplanares
  con ella, evitando z-fighting/oclusión a la escala de la maqueta.
