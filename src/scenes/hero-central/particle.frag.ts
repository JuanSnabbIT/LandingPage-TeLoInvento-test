// Fragment shader for the logo particle field: a soft circular point sprite,
// tinted between the two real brand-mark colors (bulb amber / rocket cyan --
// see CLAUDE.md: the page's Relume-derived palette is #5479E1/#809BE9, but
// that governs page chrome, not the literal logo mark being rendered here).
//
// `vNoise` (from particle.vert.ts) is now a fixed, position-only value with
// no time term, so this mix is a static per-particle tint -- it never
// changes frame to frame, per the "static screen image" follow-up.
export const particleFragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  varying float vNoise;

  void main() {
    vec2 centered = gl_PointCoord - 0.5;
    float dist = length(centered);
    float alpha = smoothstep(0.5, 0.0, dist);
    if (alpha <= 0.001) discard;

    vec3 color = mix(uColorA, uColorB, smoothstep(-1.0, 1.0, vNoise));
    gl_FragColor = vec4(color, alpha);
  }
`;
