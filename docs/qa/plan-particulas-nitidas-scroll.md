# Plan de mejora de partículas y transiciones

Fecha: 2026-09-14. Estado: **implementado** (verificado el mismo día — tsc,
71 tests unitarios, 8 e2e, tests del horneado bajo Blender y en Python puro,
todos en verde; revisión visual en vivo de Hero, Problema, Solución,
Capacidades, Valor y Proceso). Detalle de lo que cambió en el código:
`docs/architecture/3d-web-standard.md` §5.1/§5.2 y `09-registro-decisiones.md`
del vault (filas del 2026-09-14). Pendiente real, no de implementación: el
nodo de Problema se reconoce como gabinete con antena pero sus conectores
quedan comprimidos en una esquina del volumen a la pose/ángulo actual — ajuste
de diseño, no un bug.

## Objetivo y decisiones del usuario

Corregir los problemas detectados en la revisión visual y conseguir modelos reconocibles, con puntos ordenados sobre sus superficies, conexiones finas y contornos definidos, siguiendo la imagen de la ampolleta proporcionada en la conversación.

Las transformaciones estarán vinculadas al desplazamiento. Se interpreta «cada tic del scroll» como avanzar una fracción de la transición por cada desplazamiento producido por la rueda. No representa completar una transformación entera por tic ni un porcentaje fijo independiente de la configuración del mouse.

- Al avanzar dentro de un tramo de transformación, el modelo progresa.
- Al detenerse la posición de scroll, se conservan forma, posición, conexiones y dispersión de ese instante. La transición no se completa sola.
- Al retroceder, se recorre la misma transformación en sentido inverso.
- Una misma posición de página y un mismo layout producen el mismo estado, independientemente de la velocidad o del recorrido anterior.
- El comportamiento se extiende a trackpad, teclado, barra de desplazamiento y navegación táctil. La inercia nativa puede seguir desplazando la página; el modelo sigue esa posición real.
- Habrá espacios de lectura con modelos ensamblados entre transiciones. Un tic dentro de esos espacios desplaza la página sin desarmar el modelo.

Esta indicación sustituye la preferencia anterior documentada por transiciones disparadas y temporizadas. La identidad visual de la landing se conserva; la referencia orienta estructura, nitidez y luminosidad, sin obligar a trasladar sus colores a toda la página.

## Evidencia y límites del diagnóstico

La revisión anterior utilizó Chromium automatizado en 1440 × 1000 y 390 × 844, con escena forzada y herramientas de depuración. Se observaron:

- Hero vacío al llegar mediante desplazamiento; apareció en una comprobación posterior al mover el puntero.
- Wi-Fi desplazado respecto de su escenario y superpuesto al texto en móvil.
- Siluetas porosas, componentes finos poco legibles y periféricos pequeños en el set.
- Distribución de figuras de Capacidades poco relacionada espacialmente con las tarjetas.
- Nodo final visible al centrar Proceso, con posibilidad de perder la etapa explotada.

Las capturas por sí solas no validan la fluidez temporal ni el rendimiento en hardware móvil. Los archivos denominados `transition` en `test-results/particle-audit-*` no son evidencia fiable de estados intermedios: el registro de progreso mostró que las capturas ya alcanzaban el extremo del tramo. La implementación deberá obtener evidencia intermedia explícita.

## 1. Establecer la base de comparación

1. Reproducir Hero vacío y Wi-Fi desanclado con navegación normal, además de las opciones de depuración, sin mover el puntero para forzar actualizaciones.
2. Registrar cada modelo en reposo y cada transición en progreso inicial, intermedio y final; conservar posición de scroll, tamaño de pantalla y estado de escena junto a la evidencia.
3. Revisar instrucciones vigentes del proyecto y el brief de escena antes de modificarla. Actualizar la documentación autoritativa con la nueva dirección de scroll y con las decisiones técnicas que finalmente se adopten.
4. Separar fallos reproducibles de críticas de diseño y de hipótesis que necesiten comprobación.

Salida: comparación visual y casos de reproducción para verificar que las mejoras resuelven el problema real.

## 2. Garantizar visibilidad y anclaje

Revisar la actualización de la escena cuando cambia el scroll, termina una carga, cambia el viewport o se vuelve desde reposo. Verificar la relación entre cajas del DOM, poses, cámara, recortes y renderizado.

Áreas a inspeccionar: `src/scene/SceneTicker.tsx`, `registry.ts`, `anchoring.ts`, `PageSceneHost`, `PageCamera`, `hero-central/HeroCentral.tsx` y `cloud/ParticleCloud.tsx`.

Resultados exigidos:

- Hero visible al entrar sin interacción adicional.
- Modelos vinculados a sus escenarios durante todo el desplazamiento.
- Wi-Fi sin invadir títulos, párrafos o secciones vecinas.
- Ninguna silueta cortada por un límite de dibujo inesperado.
- Las cajas y resplandores vacíos no quedan como presentación persistente ante una carga o un fallo.

## 3. Vincular las transiciones directamente al scroll

El estado actual usa `tramoModo: 'disparo'`, duración base de 1,45 s y una alternativa de scrub con seguimiento de 0,4 s. Cambiar únicamente el selector de modo dejaría ese retraso y conservaría rangos pensados para disparos.

Revisar conjuntamente `src/motion/tokens.ts`, `scrollTrigger.ts`, `useTramoScrubs.ts`, `src/scene/cloud/sequence.ts` y las funciones de progreso utilizadas por los shaders.

Preparar seguimiento directo del progreso, sin finalización autónoma ni retraso temporal añadido. Recalcular los rangos de cada viaje para reservar espacio visible a salida, transformación y llegada, además de espacios de lectura. El orden de las partículas puede dar una transformación gradual, pero todos sus desfases deben depender del progreso de scroll.

Resolver de forma coherente los límites entre tramos, los saltos por navegación, la recarga a mitad de página y la inversión de dirección. Una navegación rápida puede omitir estados intermedios; debe llegar al estado correspondiente a su posición sin reproducir una cola de animaciones atrasadas.

Referencia técnica: [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), donde `scrub: true` vincula directamente el progreso y el valor numérico añade tiempo de seguimiento. La implementación concreta deberá adaptarse al contrato y a los tipos del proyecto.

## 4. Preparar modelos de superficie ordenada

Crear primero dos muestras representativas: logo sobre fondo oscuro y nodo sobre fondo claro. Usarlas para resolver los problemas de silueta, distribución, conexiones y contraste antes de extender el tratamiento a todas las formas. Esta comparación es una verificación del trabajo, no una aprobación adicional necesaria.

Revisar fuentes, topología y datos horneados en `assets-source/models/`, `assets-source/tools/shapes.json` y `bake_positions.py`.

- Distribuir puntos con separación controlada y organización acorde a curvas y planos.
- Mantener detalles que identifican el objeto: antena, pantalla, botones, conexiones y separación de piezas.
- Evitar mostrar sin revisión la triangulación original: su densidad y orientación pueden ser inadecuadas para un entramado visible.
- Definir conexiones locales sobre la superficie, respetando componentes separados y evitando enlaces que atraviesen huecos o unan piezas ajenas.
- Separar visualmente contornos principales, puntos y líneas secundarias.
- Evaluar la profundidad del logo: actualmente la definición de horneado indica `flatten: true`, mientras la referencia tiene volumen visible. Resolver su presentación considerando el espacio de la pantalla de la Central.
- Conservar identidad estable de partículas entre formas. Para nodo y nodo explotado, preservar correspondencia por componente.

Definir los datos adicionales de conectividad, detalle o componente solo tras revisar el pipeline. Incluir compatibilidad de carga y recursos alternativos. Regenerar el manifest después de cada horneado que modifique los assets.

## 5. Dar nitidez al renderizado y a las conexiones

Revisar `cloud/ParticleCloud.tsx`, shaders, `cloudTokens.ts`, paleta y carga de formas.

Objetivos de acabado:

- Puntos distinguibles y silueta estable a tamaño normal, sin textura de esquirlas ni acumulaciones opacas.
- Líneas discretas que expliquen la superficie sin competir con el contorno.
- Separación visual entre parte frontal y posterior del objeto.
- Colores por componente y brillo que preserven detalle en fondos claros y oscuros.
- Resplandor controlado, sin halos que borren la geometría. Evaluar cualquier cambio de arquitectura o postprocesado conforme a las reglas del proyecto.

Las conexiones de dos modelos diferentes no necesariamente comparten topología. Definir su comportamiento durante el morph para que la red de origen se desorganice y la de destino se forme sin líneas largas cruzadas, chasquidos o marañas. Su estado también debe ser reversible y estar controlado por scroll.

Preparar niveles de detalle para escritorio y móvil. Medir puntos, segmentos, memoria, carga y coste de dibujo; evitar cálculos de vecindad entre todos los puntos en cada frame. La nitidez debe sobrevivir a la reducción de detalle.

## 6. Aplicar el tratamiento sección por sección

| Sección | Trabajo y criterio visual |
|---|---|
| Hero | Presentación fiable de Central y logo; marca legible, buen contraste y aprovechamiento del espacio. Evaluar el tiempo de lectura antes de la salida de partículas. |
| Problema | Nodo reconocible, con antena y conectores definidos. Revisar que su presentación apoye los problemas del texto. |
| Solución | Central y periféricos legibles como conjunto; jerarquía equilibrada y relación perceptible entre componentes. |
| Capacidades | Riego, seguridad y plataforma identificables; relación clara con tarjetas, distribución equilibrada y lectura móvil. Evaluar la claridad semántica del chip. |
| Hogar | Pausa intencional dentro del recorrido; preservar anuncio y formulario, sin introducir una forma nueva por obligación. |
| Valor | Wi-Fi correctamente situado y contrastado. Evaluar cómo refuerza control, supervisión y visibilidad. |
| Proceso | Etapas separada, intermedia y ensamblada distinguibles; relación con preparación e instalación; nodo final nítido. |
| Contacto y pie | Cierre progresivo vinculado al scroll, sin restos sobre formularios; retorno coherente al retroceder. |

## 7. Ajustar los siete tramos

| Tramo | Criterio de aceptación |
|---|---|
| Logo → nodo | Origen reconocible; transformación visible entre Hero y Problema; llegada completa y estable. |
| Nodo → set | Formación comprensible de un conjunto de componentes; sin invasión del contenido durante el cruce de columnas. |
| Set → capacidades | Cambio de productos a símbolos coherente; reconocimiento de las tres capacidades al llegar. |
| Capacidades → Wi-Fi | Recorrido respetuoso con tarjetas y Hogar; sin superposición a textos o formularios. |
| Wi-Fi → nodo explotado | Llegada de piezas separadas visible antes del ensamblaje; continuidad al pasar de fondo oscuro a claro. |
| Nodo explotado → ensamblado | Espacio de scroll suficiente para examinar y detener cada etapa; piezas correspondientes y estado reversible. |
| Nodo → apagado | Desaparición gradual y reversible antes de interferir con Contacto. |

En todos los tramos debe poder detenerse el scroll a mitad y observar una composición intencional. Reducir la dispersión cuando produzca estados intermedios ilegibles o tape el contenido.

## 8. Verificación y entrega

Pruebas funcionales significativas:

- Un incremento de rueda dentro del tramo cambia el progreso en la dirección esperada.
- Una vez estabilizado el scroll, comparar el progreso inmediatamente y después de 500 y 1500 ms: permanece igual dentro de tolerancia numérica.
- Regresar a una posición anterior recupera el mismo estado, dentro de tolerancia numérica.
- Parar en 25 %, 50 % y 75 % conserva forma, conexiones y posición sin avance autónomo.
- Verificar límites, saltos de ancla, recarga intermedia, cambio de tamaño, carga tardía y vuelta desde reposo.
- Comprobar aparición del Hero sin movimiento del puntero y anclaje de Valor.

Validación visual: capturas y grabación del recorrido normal e inverso en escritorio y móvil; escenas completas y detalles a escala real; verificar texto legible durante los estados intermedios. Probar mouse con rueda y dispositivo táctil real cuando estén disponibles, dejando explícita cualquier validación pendiente.

Mantener alternativas para movimiento reducido y WebGL no disponible. En movimiento reducido, priorizar estados estables y evitar dispersión amplia; es una excepción deliberada al recorrido visual completo.

Ejecutar las comprobaciones pertinentes del proyecto: tests de progreso y geometría, E2E de escena, lint, build, pruebas del horneado cuando cambie y regeneración del manifest. Añadir medición de rendimiento en dispositivos objetivo antes de dar por cerrado el coste de conexiones y brillo.

Entregar comparaciones antes/después por sección, muestras intermedias, registro de verificaciones y documentación actualizada. Los criterios funcionales automatizados no sustituyen la revisión visual.

## Orden de ejecución

Base de comparación → visibilidad y anclaje → scroll directo → muestras de logo y nodo → preparación de todas las formas → renderizado y conexiones → composición por sección y siete tramos → validación completa.

Completar primero los fallos de fiabilidad y el contrato de interacción. Después ajustar nitidez y narrativa sobre esa base estable. Este documento no ejecuta cambios en la aplicación.
