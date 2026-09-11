// Numeric tuning knobs for the cloud shaders (T16), values per the task brief.
export const cloudTokens = {
  pointSize: { lod2: 1.9, mobile: 2.6 },
  stagger: 0.2,
  curl: 0.28,
  curlFreq: 0.9,
  alphaLight: 0.7,
  alphaDark: 1.0,
  // `drop` = caída extra (unidades de mundo) a mitad del tramo 0; `curl` = curl extra
  // sumado a `curl` durante ese mismo tramo. Ambos modulados por sin(PI*t): 0 en reposo.
  fluye: { drop: 0.25, curl: 0.15 },
};
