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
  particleScale: 0.042,
  // Tamaño relativo según la CERCANÍA A ARISTA horneada (canal A de la textura
  // de parámetros, ver cloud.vert.ts y bake_positions.py): chico pegado a una
  // arista viva, grande en el centro de una cara abierta. El horneado además
  // pone más partículas cerca de las aristas, así que ahí quedan chicas Y
  // juntas, que es lo que hace legible la silueta.
  edgeScale: 0.38,
  faceScale: 1.32,
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
  spin: 0.5,
  // Desfase por partícula dentro de un tramo. 0.2 movía la nube casi en bloque;
  // 0.82 la convierte en una onda que barre el enjambre, que es lo que hace que
  // la transformación se LEA. Sale de la técnica del sitio Dala, donde el
  // desfase por partícula cubre ~95 % del recorrido (ingeniería inversa de su
  // shader de simulación, ver docs/architecture/3d-web-standard.md).
  stagger: 0.82,
  // Resorte por partícula (ver cloud.vert.ts): omega = rapidez de asentamiento,
  // zeta = amortiguamiento (< 1 sobrepasa). 0.62 da ~9 % de sobrepaso, que se
  // nota como "llegó y se acomodó" en vez de "llegó y frenó en seco".
  spring: { omega: 8.5, zeta: 0.62 },
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
