# Modelos 3D generados (placeholders procedurales)

Generados el 2026-09-11 con Blender 5.2 headless por `generar_modelos.py`
(mismo directorio). **No son diseño de producto**: son formas genéricas
reconocibles para que las tarjetas de Capacidades tengan un visual 3D
mientras no existan los modelos reales de los nodos. Cuando el equipo
produzca el diseño real, se reemplaza el `.glb` con el mismo nombre y el
código no cambia.

Regenerar todos:

```
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --python assets-source/models/capacidades/generar_modelos.py -- todos
```

Salida: `.blend` fuente acá, `.glb` final en `public/models/capacidades/`.
Convención del vault (09-registro-decisiones 2026-09-09): fuentes en
`assets-source/`, solo exports optimizados en `public/`.

| Archivo | Qué representa | Tarjeta destino | Dimensiones aprox. (m) | Mallas | Peso GLB |
|---|---|---|---|---|---|
| `sensor_humedad` | Sonda de humedad de suelo tipo estaca: cabezal plástico oscuro con etiqueta azul, dos varillas de acero hacia abajo, prensacable y cable | Set de Riego | 0.034 × 0.03 × 0.19 (alto, con varillas) | Sensor_Head, Sensor_Label, Probe_Left/Right, Cable_Gland, Cable | 34 KB |
| `valvula_riego` | Electroválvula: cuerpo tubular horizontal con roscas de bronce en ambos extremos, bonete, bobina solenoide vertical con tuerca hexagonal, cable | Set de Riego (alternativa a la sonda) / Automatización programable | 0.14 × 0.04 × 0.08 | Valve_Body, Thread_Left/Right, Valve_Bonnet, Solenoid_Coil, Solenoid_Nut, Cable | 59 KB |
| `sensor_perimetral` | Sensor de presencia tipo PIR para pared: carcasa blanca redondeada, lente domo oscura semitransparente, LED rojo de estado, rótula y placa de montaje | Set de Seguridad Perimetral / Notificaciones en tiempo real | 0.062 × 0.05 × 0.09 | Housing, Lens_Dome, Status_LED, Bracket_Ball, Bracket_Plate | 37 KB |

## Cómo se usan en la página

Todavía **no están conectados** a ninguna sección. La forma prevista es la
misma que Solución y Valor: `AnchoredModel` (src/scenes/anchored-model) con
la ref de la tarjeta como `anchorRef`, `fit` ≈ 0.7 y giro lento. Las
tarjetas de Capacidades hoy usan íconos SVG; para meter un modelo hay que
reservar un área (por ejemplo un `.card__visual` de 120 px de alto encima
del título) y ocultar el ícono con `html.scene-3d`, igual que se hizo con
los placeholders de Problema, Solución y Valor.

Sugerencia de reparto (ver conversación del 2026-09-11):

- Set de Riego → `sensor_humedad` (o `valvula_riego` si se confirma que el
  sensor es add-on y no parte del kit base — decisión abierta en el vault)
- Set de Seguridad Perimetral → `sensor_perimetral`
- Automatización programable → `valvula_riego`
- Notificaciones en tiempo real → `sensor_perimetral` con el LED animado,
  o nada
- Plataforma Central → ya cubierta por `central-lod1` / kiosk

## Qué debería reemplazarlos

- Un nodo real de riego (carcasa + bornera, como `dispositivo_industrial_bornera.blend`)
  con la sonda o la válvula conectada por cable.
- Un nodo real de seguridad con el sensor integrado o cableado.
- Materiales con el gris y el acento de marca definitivos; los actuales son
  colores neutros elegidos a ojo (plástico gris oscuro, acero, bronce,
  blanco, azul `#2B78E0` como etiqueta).

## Notas técnicas

- Unidades reales en metros; el `AnchoredModel` escala por `maxDim`, así que
  el tamaño absoluto no importa para la página.
- Todas las piezas son mallas separadas con nombre, para poder animar una
  vista explotada más adelante (mismo enfoque que el Nodo en Cómo trabajamos).
- Sin texturas: solo Principled BSDF con color base, metalness y roughness.
  La lente del PIR usa alpha 0.9 (blend), por eso puede necesitar
  `transparent` en three si se ve opaca.
- Bevel por modificador (se aplica al exportar) y sombreado suave por ángulo.
