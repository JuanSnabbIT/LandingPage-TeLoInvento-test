// Vertex shader for the soft radial glow behind the Device -- trivial,
// just passes the plane's UV through for the fragment shader's falloff.
export const glowVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
