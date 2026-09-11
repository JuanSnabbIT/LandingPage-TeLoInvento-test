// Numeric tuning knobs for the cloud shaders (T16), values per the task brief.
export const cloudTokens = {
  pointSize: { lod2: 1.9, mobile: 2.6 },
  stagger: 0.2,
  curl: 0.28,
  curlFreq: 0.9,
  alphaLight: 0.7,
  alphaDark: 1.0,
  // Fracción de alpha que se resta a mitad de un tramo 'viaje' (× sin(PI·t),
  // 0 en los extremos) para que la nube se adelgace mientras cruza entre
  // secciones, en vez de mantenerse a alpha plena sobre el texto que corre
  // por debajo del corredor del scissor.
  travelDip: 0.35,
  // `drop` = caída extra (unidades de mundo) a mitad del tramo 0; `curl` = curl extra
  // sumado a `curl` durante ese mismo tramo. Ambos modulados por sin(PI*t): 0 en reposo.
  fluye: { drop: 0.25, curl: 0.15 },
};
