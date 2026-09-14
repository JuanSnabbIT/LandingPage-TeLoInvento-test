# hogar.glb (placeholder procedural: ícono de casa extruido)

Generado con Blender 5.2 headless por `generar_modelo.py` (mismo directorio).
**No es diseño de producto**: es el ícono plano "home" de la imagen de
referencia del dueño del proyecto, extruido en 3D con el mismo tratamiento que
`assets-source/models/valor/wifi.glb` — silueta de un solo color con grosor y
bordes suaves. Techo a dos aguas con aleros en punta, paredes más angostas que
el techo, chimenea a la derecha y la puerta como hueco recortado abajo al
centro. Sin ventanas ni otros detalles. Cuando exista el modelo real, se
reemplaza `hogar.glb` con el mismo nombre y el código no cambia.

Historia (2026-09-14): primero una casa de cajas con antena y anillos de señal;
después una casa ilustrada estilo emoji (techo rojo, ventana, pomo), que el
dueño rechazó mandando la referencia del ícono.

Regenerar (y después re-hornear la forma `hogar` y correr `npm run manifest`):

```
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --python assets-source/models/hogar/generar_modelo.py
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --python assets-source/tools/bake_positions.py -- --shape hogar
npm run manifest
```

Una sola malla y un solo material: `Casa`.

## Cómo se usa en la página

Forma `hogar` en `assets-source/tools/shapes.json`, horneada por
`bake_positions.py` como el resto de la nube de partículas. Es la tercera
tarjeta del carrusel de Capacidades (`src/sections/Capacidades.tsx`, slot
`capacidades`). En `shapes.json`:

- `colors`: `Casa` en `#29A8E6`, el celeste de la referencia.
- `yaw: -0.3` — girada un poco para que se lea el grosor (la tarjeta usa pose
  frontal).
- `visibleFrom: [0, -1, 0]` — sólo se hornean los puntos que ve la cámara (la
  nube no tiene oclusión: la cara de atrás se transparentaba y emborronaba el
  borde del hueco de la puerta).
- `density: 0.3` — con todas las partículas en la cara de frente, 16 384
  posiciones distintas se fundían en una imagen plana en la caja de la tarjeta.
- `scatter` — los biseles dejan triángulos largos donde la retícula de
  superficie dibujaría aros.

## Notas técnicas

- La silueta se dibuja en el plano XZ con medidas tomadas de la referencia
  (ícono de 200 px, `OUTLINE`), se extruye en Y (`DEPTH`, ~20 % del ancho como
  wifi.glb) y se biselan todas las aristas (`ROUND`).
- El horneado normaliza al lado mayor del bbox: sólo importan las proporciones.
- Frente hacia -Y en Blender.
