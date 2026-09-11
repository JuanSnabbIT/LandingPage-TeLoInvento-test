// GLSL3 fragment shader for the stateless particle-cloud morph (T16).
// Same ShaderMaterial({ glslVersion: THREE.GLSL3 }) note as cloud.vert.ts:
// no `#version`, no `precision` line (three injects it), `out vec4
// fragColor` instead of `gl_FragColor`.
//
// Desde que la nube se dibuja con mallas instanciadas (ver cloud.vert.ts) acá
// no hay recorte circular ni `gl_PointCoord`: la silueta la da la malla y el
// relieve lo da `vShade`, el sombreado plano por cara que calculó el vertex.
export const cloudFrag = /* glsl */ `
  uniform vec3 uColorProdLight; uniform vec3 uColorProdDark;
  uniform float uSurface; uniform float uAlpha; uniform float uAlphaLight; uniform float uAlphaDark;
  in vec3 vColor; in float vTint; in float vShade; out vec4 fragColor;
  void main() {
    // vColor y vTint ya vienen mezclados A→B por partícula desde el vertex:
    // acá solo se decide entre el azul de producto y el color horneado.
    vec3 prod = mix(uColorProdDark, uColorProdLight, uSurface);
    vec3 c = mix(prod, vColor, vTint) * vShade;
    float alpha = uAlpha * mix(uAlphaDark, uAlphaLight, uSurface);
    fragColor = vec4(c * alpha, alpha);   // premultiplicado
  }`;
