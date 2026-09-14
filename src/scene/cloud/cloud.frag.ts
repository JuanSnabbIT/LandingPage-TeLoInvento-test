// Analytic circular dots: a crisp core with a small, controlled luminous edge.
export const cloudFrag = /* glsl */ `
  uniform vec3 uColorProdLight, uColorProdDark;
  uniform float uSurface, uAlpha, uAlphaLight, uAlphaDark;
  uniform int uProtectedCount;
  uniform vec4 uProtected[24];
  in vec3 vColor;
  in float vTint, vFade, vNetwork;
  out vec4 fragColor;
  vec3 displayColor(vec3 c) {
    return mix(12.92 * c, 1.055 * pow(max(c, vec3(0.)), vec3(1./2.4)) - .055, step(vec3(.0031308), c));
  }
  void main() {
    for (int i = 0; i < 24; i++) {
      if (i >= uProtectedCount) break;
      vec4 box = uProtected[i];
      if (gl_FragCoord.x >= box.x && gl_FragCoord.x <= box.z && gl_FragCoord.y >= box.y && gl_FragCoord.y <= box.w) discard;
    }
    vec3 c = mix(mix(uColorProdDark, uColorProdLight, uSurface), vColor, vTint);
    float alpha = uAlpha * mix(uAlphaDark, uAlphaLight, uSurface) * vFade;
    #ifdef SURFACE_LINES
      alpha *= vNetwork * mix(.40, .30, uSurface);
    #else
      float radius = length(gl_PointCoord - .5) * 2.;
      float aa = max(fwidth(radius), .06);
      float core = 1. - smoothstep(.78-aa, .78+aa, radius);
      float halo = (1. - smoothstep(.55, 1., radius)) * .20;
      alpha *= max(core, halo);
    #endif
    if (alpha < .005) discard;
    fragColor = vec4(displayColor(c) * alpha, alpha);
  }
`;
