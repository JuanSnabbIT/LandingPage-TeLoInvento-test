# 01 — HARDWARE MAP

## Principio

Para Blender no es necesario reproducir visualmente todos los componentes electrónicos.

Solo se modelarán los elementos que condicionan la carcasa:

- PCB
- Pantalla
- Botones
- Agujeros de montaje
- USB-C superior
- Envolvente frontal/trasera

El ESP32/Wemos queda debajo de la pantalla y no necesita un modelo independiente para la carcasa V1.

## Envolvente

### Frente
- Máximo sobre PCB: ~14 mm
- Pantalla: ~11 mm
- Botones: ~14 mm

### Trasera
- Máximo bajo PCB: ~6 mm
- Corresponde principalmente a pines/soldaduras

## Restricción lateral

Todo el hardware queda contenido dentro del perímetro aproximado de la PCB:
`85 × 135 mm`.

## Montaje

La PCB se monta paralela al panel frontal inclinado.

La pantalla y los botones mantienen su geometría real relativa porque permanecen montados sobre la PCB definitiva.
