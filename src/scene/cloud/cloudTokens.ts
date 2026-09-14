// Numeric tuning knobs for the cloud shaders (T16), values per the task brief.
export const cloudTokens = {
  // Malla de partícula (public/particles/, entregadas por el dueño del
  // proyecto): un sólido de 48 caras por partícula, instanciado. `lod2` para
  // escritorio y `mobile` para teléfono -- la versión mobile tiene menos
  // vértices para la misma silueta.
  particleMesh: { lod2: '/particles/py-lod1.glb', mobile: '/particles/py-lod7.glb' },
  // Tamaño de cada partícula como fracción del SEMI-tamaño del modelo (la
  // escala de la pose). El modelo mide 2 de esos, así que 0.022 deja cada
  // partícula en ~1 % del modelo: en una forma de 450 px son ~10 px de arista.
  // Va atado a la pose y no fijo en unidades de mundo para que la partícula se
  // vea igual de grande en una sección con la caja chica que en una grande.
  // Baja de 0.042 a 0.030 para compensar que el rango de tamaño se abrió
  // (0.22..1.9 con jitter): la media queda donde estaba y lo que cambia es la
  // VARIANZA, que es el punto -- sin esto las partículas grandes se volvían
  // esquirlas.
  particleScale: 0.032,
  // Tamaño relativo según la CERCANÍA A ARISTA horneada (canal A de la textura
  // de parámetros, ver cloud.vert.ts y bake_positions.py): chico pegado a una
  // arista viva, grande en el centro de una cara abierta. El horneado además
  // pone más partículas cerca de las aristas, así que ahí quedan chicas Y
  // juntas, que es lo que hace legible la silueta.
  // Rango de tamaño: 0.22..1.9 = 8.6x. El del sitio de referencia es 128x, y no
  // se puede igualar -- su partícula más chica mide 0.004 unidades de mundo y en
  // una caja de 300 px sería invisible. Con el jitter por semilla el rango
  // efectivo llega a ~15x, que es la vía legítima: ampliar el rango, no bajar la
  // media.
  edgeScale: 0.40,
  faceScale: 1.22,
  // Ruido de tamaño por partícula, encima de la rampa geométrica (ver
  // cloud.vert.ts). Sin esto el grano queda parejo y la malla se lee como una
  // costra regular.
  // 0.35 y no el 0.45 de la spec: nuestra partícula ya es 4-8x más gruesa que la
  // del sitio de referencia en proporción al modelo (su hero es a pantalla
  // completa, nuestras cajas miden 300-500 px), así que el mismo rango relativo
  // acá produce esquirlas en vez de grano. Se conserva la VARIANZA, que es lo que
  // rompe la costra pareja; se recorta el extremo.
  sizeJitter: 0.28,
  // Cuánto se abre el enjambre a mitad del tramo (el u_factor del sitio de
  // referencia llega a 0.23; 0.18 deja margen para el corredor del scissor).
  spread: 0.18,
  // Desorden del frente del barrido: 0 = guillotina perfecta, 1 = el desorden
  // por semilla de antes. 0.25 rompe apenas la línea recta.
  sweepJitter: 0.25,
  // Opacidad que queda en la cara de atrás, para que no compita con la de adelante.
  backAlpha: 0.3,
  // Orientación de cada pirámide (ver cloud.vert.ts). `billboard: false` = el
  // modo de escritorio de Dala: giro por ruido sobre un eje fijo, siluetas
  // variadas. `true` = su modo mobile: todas encaran a la cámara.
  // Nos quedamos con el billboard y NO con el giro por ruido de su escritorio:
  // en Dala cada partícula es diminuta frente a un modelo a pantalla completa,
  // así que las caras de canto se leen como textura fina; acá el modelo entra en
  // una caja de 360 px y las mismas caras de canto se ven como púas.
  billboard: true,
  // Frecuencia del ruido que desfasa ese giro: alto = partículas vecinas muy
  // distintas, bajo = zonas enteras orientadas parecido.
  orientNoise: 2.4,
  // Giro extra por semilla, encima del ruido (1 = una vuelta repartida).
  // El giro del billboard es lo único que varía la silueta cuando todas las caras
  // encaran a la cámara: con media vuelta las siluetas se repiten.
  spin: 1.0,
  // Desfase por partícula dentro de un tramo. 0.2 movía la nube casi en bloque;
  // 0.82 la convierte en una onda que barre el enjambre, que es lo que hace que
  // la transformación se LEA. Sale de la técnica del sitio Dala, donde el
  // desfase por partícula cubre ~95 % del recorrido (ingeniería inversa de su
  // shader de simulación, ver docs/architecture/3d-web-standard.md).
  stagger: 0.82,
  // Resorte por partícula (ver cloud.vert.ts): omega = rapidez de asentamiento,
  // zeta = amortiguamiento (< 1 sobrepasa). 0.62 da ~9 % de sobrepaso, que se
  // nota como "llegó y se acomodó" en vez de "llegó y frenó en seco".
  // zeta derivado del muelle del sitio de referencia (k 0.006, fricción 0.892 a
  // 60 fps -> omega_n 4.65 rad/s, 2*zeta*omega_n 6.48 -> zeta ~ 0.70), redondeado
  // hacia arriba porque no tenemos el bloom que allá disimula el rebote. Da ~3.8 %
  // de sobrepaso; 0.62 daba 8.4 %, que en una caja de 300 px se lee como goma.
  spring: { omega: 8.5, zeta: 0.72 },
  // Amplitud del curl en vuelo. Subió de 0.28 a 0.42 para que el enjambre se
  // abra más "por el aire" mientras cruza, en vez de viajar como un bloque.
  curl: 0.48,
  curlFreq: 0.9,
  // Sobre fondo claro la nube va algo más transparente que sobre oscuro, pero
  // 0.7 con el perfil de sprite viejo dejaba el color en un pastel indistinto
  // (ver cloud.frag.ts). 0.85 + núcleo lleno = las piezas se leen por su color.
  // Con partículas sólidas que se superponen, la misma alpha de los puntos
  // planos saturaba la forma entera: acá manda el volumen, no la acumulación.
  alphaLight: 0.62,
  alphaDark: 0.82,
  // Fracción de alpha que se resta a mitad de un tramo 'viaje' (× sin(PI·t),
  // 0 en los extremos) para que la nube se adelgace mientras cruza entre
  // secciones, en vez de mantenerse a alpha plena sobre el texto que corre
  // por debajo del corredor del scissor. Subió de 0.35 a 0.5 al agregar el giro
  // en vuelo: el enjambre disperso cubre mucha más área que antes y, con el
  // sprite de núcleo lleno, a mitad del cruce entre Capacidades y Valor tapaba
  // el texto de las tarjetas. Aun con el 0.5 la nube en vuelo se ve bastante
  // más que con el sprite viejo sin dip.
  travelDip: 0.5,
  // Giro en vuelo (ver cloud.vert.ts): `radius` es el radio máximo de la órbita
  // a mitad de camino, en las mismas unidades de mundo que `curl` y
  // `fluye.drop`; `turns` son las vueltas completas que da cada partícula
  // alrededor del eje del viaje entre origen y destino.
  swirl: { radius: 0.85, turns: 1.35 },
  // `drop` = caída extra (unidades de mundo) a mitad del tramo 0; `curl` = curl extra
  // sumado a `curl` durante ese mismo tramo. Ambos modulados por sin(PI*t): 0 en reposo.
  fluye: { drop: 0.25, curl: 0.15 },
};
