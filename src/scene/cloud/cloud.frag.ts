// GLSL3 fragment shader for the stateless particle-cloud morph (T16).
// Same ShaderMaterial({ glslVersion: THREE.GLSL3 }) note as cloud.vert.ts:
// no `#version`, no `precision` line (three injects it), `out vec4
// fragColor` instead of `gl_FragColor`.
export const cloudFrag = /* glsl */ `
  uniform vec3 uColorProdLight; uniform vec3 uColorProdDark;
  uniform float uSurface; uniform float uAlpha; uniform float uAlphaLight; uniform float uAlphaDark;
  in vec3 vColor; in float vTint; out vec4 fragColor;
  void main() {
    float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
    // Perfil del sprite: núcleo lleno con borde suave. El perfil anterior
    // (0.05/d - 0.1) es una campana muy picuda -- llega a alpha 1 sólo dentro de
    // d < 0.048 -- y el punto mide 1.9 px * dpr: los píxeles del centro caen en
    // d ~ 0.13 y recibían alpha 0.28, que sobre fondo claro (uAlphaLight) se iba
    // a 0.20. De ahí que la nube se viera blanquecina y el color horneado de
    // cada pieza no se distinguiera. Con smoothstep el centro llega lleno y el
    // borde sigue difuminado, así que la nube no se vuelve un cartón.
    float a = smoothstep(0.5, 0.16, d);
    // vColor y vTint ya vienen mezclados A→B por partícula desde el vertex:
    // acá solo se decide entre el azul de producto y el color horneado.
    vec3 prod = mix(uColorProdDark, uColorProdLight, uSurface);
    vec3 c = mix(prod, vColor, vTint);
    float alpha = a * uAlpha * mix(uAlphaDark, uAlphaLight, uSurface);
    fragColor = vec4(c * alpha, alpha);   // premultiplicado
  }`;
