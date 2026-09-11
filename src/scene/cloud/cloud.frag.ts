// GLSL3 fragment shader for the stateless particle-cloud morph (T16).
// Same ShaderMaterial({ glslVersion: THREE.GLSL3 }) note as cloud.vert.ts:
// no `#version`, no `precision` line (three injects it), `out vec4
// fragColor` instead of `gl_FragColor`.
export const cloudFrag = /* glsl */ `
  uniform vec3 uColorProdLight; uniform vec3 uColorProdDark; uniform vec3 uColorLogoA; uniform vec3 uColorLogoB;
  uniform float uSurface; uniform float uLogoTint; uniform float uAlpha; uniform float uAlphaLight; uniform float uAlphaDark;
  in float vSeed; in float vTl; out vec4 fragColor;
  void main() {
    float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
    float a = clamp(0.05 / d - 0.1, 0., 1.);
    vec3 prod = mix(uColorProdDark, uColorProdLight, uSurface);
    vec3 logo = mix(uColorLogoA, uColorLogoB, vSeed);
    vec3 c = mix(prod, logo, uLogoTint);
    float alpha = a * uAlpha * mix(uAlphaDark, uAlphaLight, uSurface);
    fragColor = vec4(c * alpha, alpha);   // premultiplicado
  }`;
