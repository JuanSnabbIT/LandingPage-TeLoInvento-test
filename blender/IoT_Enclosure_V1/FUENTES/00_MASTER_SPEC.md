# 00 — MASTER SPEC

## Producto

Carcasa de sobremesa para dispositivo IoT con pantalla y tres botones físicos.

## Revisión

- Revisión documental: V1-R001
- PCB: definitiva para esta versión
- Unidades: milímetros
- Fabricación: FDM/FFF
- Impresora objetivo: Artillery Genius Pro
- Boquilla objetivo: 0.8 mm — `MUY_PROBABLE`, inferida del último G-code
- Material de prototipo: PLA
- Material final preferido: PETG
- Acabado exterior: ligeramente mate

## Convención de coordenadas

PCB vista de frente:

- X: izquierda → derecha
- Y: abajo → arriba
- Z: desde la cara frontal de la PCB hacia el usuario

El origen conceptual de PCB es la esquina inferior izquierda de su cara frontal.

## PCB

| Parámetro | Valor | Estado |
|---|---:|---|
| Ancho X | ~85.00 mm | MEDIDO_APROX |
| Alto Y | ~135.00 mm | MEDIDO_APROX |
| Espesor | ~1.42 mm | MEDIDO_APROX |
| Protrusión frontal máxima | ~14.00 mm | MEDIDO_APROX |
| Protrusión trasera máxima | ~6.00 mm | MEDIDO_APROX |
| Elementos fuera del perímetro X/Y | Ninguno | APROBADO |

Volumen técnico aproximado del hardware, sin holguras:
`85 × 135 × 21.42 mm`

## Holgura general PCB

- Holgura nominal alrededor del perímetro: ~1.5 mm — `APROBADO`
- Cavidad útil inicial orientativa: ~88 × 138 mm — `DERIVADO`

## Pantalla

| Parámetro | Valor | Estado |
|---|---:|---|
| Ancho exterior | ~61.33 mm | MEDIDO_APROX |
| Alto exterior | ~94.33 mm | MEDIDO_APROX |
| Cara PCB → superficie exterior | ~11.00 mm | MEDIDO_APROX |
| Margen superior PCB → pantalla | ~18.40 mm | MEDIDO_APROX |
| Margen izquierdo aproximado | ~12.30 mm | MEDIDO_APROX |
| Margen derecho aproximado | ~11.70 mm | MEDIDO_APROX |

## Botones físicos

- Cantidad: 3
- Los botones reales soldados a la PCB serán los botones visibles.
- No se usarán caps/pulsadores impresos.

| Parámetro | Valor | Estado |
|---|---:|---|
| Tamaño exterior | ~10 × 10 mm | MEDIDO_APROX |
| Forma | Cuadrada con esquinas redondeadas | APROBADO |
| Cara PCB → parte superior | ~14 mm | MEDIDO_APROX |
| Borde inferior PCB → borde inferior botón | ~1.2 mm | MEDIDO_APROX |
| Centro Y aproximado | ~6.2 mm | DERIVADO |

Centros X aproximados desde el borde izquierdo de PCB:

- BTN_01: ~18.30 mm
- BTN_02: ~39.50 mm
- BTN_03: ~59.80 mm

## Agujeros de montaje PCB

- Cantidad: 4
- Diámetro: ~2.8 mm
- Centro de cada agujero: ~5 mm desde los dos bordes más cercanos

Coordenadas derivadas aproximadas:

- H1 inferior izquierda: (5, 5)
- H2 inferior derecha: (80, 5)
- H3 superior izquierda: (5, 130)
- H4 superior derecha: (80, 130)

## USB-C superior — prototipo

| Parámetro | Valor | Estado |
|---|---:|---|
| Ancho boca | ~9 mm | MEDIDO_APROX |
| Alto boca | ~3 mm | MEDIDO_APROX |
| Centro X desde borde izquierdo | ~38.03 mm | MEDIDO_APROX |
| Sobresale por borde superior PCB | ~2 mm | MEDIDO_APROX |
| Cara PCB → punto exterior | ~6.5 mm | MEDIDO_APROX |
| Borde superior PCB → parte inferior USB | ~9.77 mm | MEDIDO_APROX |

## Accesos externos V1

1. Pantalla
2. Tres botones físicos
3. USB-C superior funcional del prototipo
4. Abertura USB-C trasera reservada para futuro sistema de carga

No existen otros conectores externos requeridos en V1.
