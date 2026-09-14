// Surface dots and restrained flight. Sizes are relative to the anchor scale.
export const cloudTokens = {
  particleScale: 0.010,
  edgeScale: 0.85,
  faceScale: 1.05,
  sizeJitter: 0.12,
  spread: 0.045,
  sweepJitter: 0.08,
  backAlpha: 0.35,
  stagger: 0.32,
  curl: 0.12,
  curlFreq: 0.9,
  alphaLight: 0.92,
  alphaDark: 1.0,
  travelDip: 0.25,
  swirl: { radius: 0.09, turns: 0.45 },
  // Tramos `morphEnSitio` con `stagger: true` (sequence.ts) -- entre formas SIN
  // relación física, hoy sólo el carrusel de Capacidades: mismo barrido dirigido
  // que un viaje, pero MUY contenido -- no hay caja de destino, así que un curl
  // o una caída de alpha del tamaño de un viaje se sentirían "flotando", no
  // transformándose. `curl` es ~40% del de vuelo, `dip` ~60% del `travelDip`.
  enSitio: { curl: 0.05, dip: 0.15 },
  // Llama del logo (partículas con nivel de animación en el bake): sin movimiento, sólo parpadeo.
  // `blink`: cuánto se apaga una partícula de nivel máximo en el pico de su pulso (0..1);
  // `blinkRate`: rad/s, cada partícula lo escala por 0.6..1.4 según su semilla (ciclos de ~3-7 s).
  flame: { blink: 0.9, blinkRate: 1.4 },
  // Puntero, en un área chica alrededor del cursor (sin empujar: la silueta no se deforma).
  // `radius` y `lift` relativos al span del modelo; `lift` hacia la cámara, `grow` sube el tamaño
  // del punto (así se lee la elevación) y `white` cuánto se aclara a blanco en el centro.
  pointer: { radius: 0.16, lift: 0.08, grow: 0.35, white: 0.9, damping: 8 },
  // "Vida" en reposo (2026-09-14, pedido del dueño): respiración continua, independiente del
  // scroll y del puntero, apagada con reduced-motion. Mientras esté activa la nube pide frames
  // seguidos (como la llama) -- deja de haber 0 frames en reposo mientras un modelo esté en
  // pantalla; es el costo aceptado a cambio de la "vida". (Los destellos aleatorios que la
  // acompañaban se descartaron el mismo día.)
  life: {
    // Todo el modelo se agranda y achica un poquito, ciclo de varios segundos. Se suma a la
    // respiración de tramo existente (`spread`, que sólo corre a mitad de una transición) --
    // ésta corre siempre. `freq` en Hz (ciclos/s).
    breatheAmp: 0.012, breatheFreq: 0.2,
  },
};
