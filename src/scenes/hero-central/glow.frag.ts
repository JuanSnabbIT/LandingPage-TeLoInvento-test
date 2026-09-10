// Fragment shader for the soft radial glow/spotlight behind the Device --
// a procedural falloff, no image/texture asset (same "no noise texture"
// philosophy as the particle shaders: cheap, self-contained GLSL math).
// Static/no time uniform on purpose -- this is static visual polish, not
// an idle animation, so there's nothing to gate behind
// prefers-reduced-motion here.
export const glowFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;

  varying vec2 vUv;

  void main() {
    vec2 centered = (vUv - 0.5) * 2.0; // -1..1, 0 at center
    float dist = length(centered);

    // Soft falloff -- pow() sharpens the edge taper so it reads as a
    // diffuse pool of light, not a hard-edged circle.
    float falloff = pow(clamp(1.0 - dist, 0.0, 1.0), 2.2);

    gl_FragColor = vec4(uColor, falloff * uIntensity);
  }
`;
