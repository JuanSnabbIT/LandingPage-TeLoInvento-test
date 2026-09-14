# 03 — DESIGN DECISIONS

## D001 — PCB definitiva
La PCB actual se considera definitiva para la carcasa V1.

## D002 — Diseño desde adentro hacia afuera
El exterior se deriva del hardware, holguras y requisitos funcionales.

## D003 — Pantalla
- Al ras con el frontal.
- Sin protector adicional.
- Centrada horizontalmente.
- Pequeño solape del marco.

## D004 — Botones
- Se usan directamente los tres botones soldados a la PCB.
- No se modelan botones externos impresos.

## D005 — PCB fijada al cuerpo trasero
La PCB se atornilla al `REAR_BODY`.

## D006 — Fijación PCB
- 4 tornillos M2.5.
- 4 postes de apoyo.
- Topes/guías laterales para impedir movimiento X/Y.
- La PCB debe poder levantarse verticalmente tras retirar tornillos.
- Sin clips.

## D007 — Unión de carcasa
- 4 tornillos M3 Allen.
- Cabeza cilíndrica embutida.
- Acceso desde la parte inferior.
- Rosca directa en plástico.
- Sin inserts.
- Guía perimetral macho-hembra simple.
- Sin labio adicional de sellado.

## D008 — Estética
Las decisiones estéticas menores quedan delegadas al diseño técnico, manteniendo el lenguaje de los renders.

Prioridades:
1. proporción coherente;
2. rigidez;
3. fabricabilidad;
4. limpieza visual.

## D009 — Profundidad de base
Se determinará en el primer blockout considerando:
- proporciones de los renders;
- estabilidad;
- cavidad de lastre;
- espacio interno;
- centro de gravedad.

## D010 — Logo
- Logo grande.
- Parte trasera.
- Relieve positivo.
- Simplificar detalles si es necesario para boquilla de 0.8 mm.
- No interferir con USB-C, tornillos o línea de unión.

## D011 — Impresión
La geometría del producto no se deformará para facilitar impresión.
Cada mitad se orientará independientemente en el slicer.

## D012 — Acabado
- Superficie exterior suave.
- Acabado físico ligeramente mate.
- Sin microtextura geométrica.
