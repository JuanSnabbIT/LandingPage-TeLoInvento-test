# 02 — ENCLOSURE REQUIREMENTS

## Uso

- Dispositivo estático sobre mesa o repisa.
- Usuario principalmente de pie frente al equipo.
- Uso mayoritariamente interior.
- Puede estar en exterior protegido.
- Puede existir humedad ambiental, polvo y salpicaduras ocasionales.
- No se considera exposición directa a lluvia.
- No se busca certificación IP en V1.

## Arquitectura

La carcasa se divide en dos piezas principales:

1. `FRONT_BODY`
2. `REAR_BODY`

La línea de separación seguirá aproximadamente el contorno lateral del dispositivo.

## Forma general

Dirección formal basada en los renders de referencia:

- terminal de sobremesa;
- frontal inclinado;
- base profunda y estable;
- ancho exterior uniforme hacia atrás;
- transiciones suaves;
- esquinas y cantos redondeados;
- trasera redondeada;
- pequeño tramo superior plano seguido de curva hacia atrás;
- base inferior plana.

## Ángulo frontal

- ~15° hacia atrás respecto de la vertical — `INICIAL`
- Se validará visualmente antes de congelar.

## Panel frontal

- Pantalla + botones en una zona completamente plana.
- Pantalla directamente expuesta, sin acrílico adicional.
- Superficie de pantalla al ras del frontal.
- El marco debe ocultar PCB, bordes no deseados y electrónica.
- La pantalla debe quedar visualmente centrada horizontalmente.
- No es obligatorio centrarla verticalmente.
- Bisel perimetral marcado alrededor de todo el panel frontal.
- El panel queda al mismo nivel general que el cuerpo.

## Abertura de pantalla

- Pequeño solape del marco sobre el borde negro.
- Solape inicial sugerido: ~0.8 mm por lado — `INICIAL`
- Abertura derivada inicial: ~59.7 × 92.7 mm — `INICIAL`
- Validar con hardware antes de impresión final.

## Aberturas de botones

- Los botones físicos atraviesan el frontal.
- Aberturas cuadradas con esquinas redondeadas.
- Tamaño inicial: ~10.6 × 10.6 mm — `INICIAL`
- Holgura inicial: ~0.3 mm por lado.
- Zona frontal de botones completamente plana.

## Espesores

- Pared nominal: 2.4 mm — `APROBADO`
- Refuerzos locales: 3.2 mm — `APROBADO`

## Ventilación

- Sin rejillas.
- No agregar perforaciones decorativas o de ventilación.

## Base y lastre

- Reservar cavidad genérica para placas de lastre.
- El usuario adaptará las placas al espacio disponible.
- El lastre debe quedar bajo y hacia la zona posterior.
- No diseñar compartimiento de baterías en V1.
- No agregar tapa de batería.

## Futuro USB-C trasero

- Abertura centrada horizontalmente.
- Ajustada al conector.
- Referencia inicial: ~9 × 3 mm.
- En V1 puede quedar sin módulo conectado.

## Patas

- 4 patas de goma.
- 4 alojamientos inferiores.
- Diámetro de alojamiento: ~15 mm — `APROBADO`
- Profundidad: `PENDIENTE`.
