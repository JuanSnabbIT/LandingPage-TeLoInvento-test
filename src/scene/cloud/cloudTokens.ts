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
  // Llama del logo (partículas marcadas en el bake): turbulencia relativa al span y parpadeo de tamaño.
  flame: { amp: 0.035, freq: 2.6, speed: 0.9, flicker: 0.35 },
  // Puntero: empuje muy sutil de las partículas cerca del cursor (radio y empuje relativos al span del modelo).
  pointer: { radius: 0.5, push: 0.045, damping: 8 },
};
