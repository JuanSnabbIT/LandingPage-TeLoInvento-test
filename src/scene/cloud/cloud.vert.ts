import { curlGlsl } from './curl.glsl';

// GLSL3 vertex shader for the stateless particle-cloud morph (T16).
// Consumed via ShaderMaterial({ glslVersion: THREE.GLSL3 }), which is why
// there's no `#version` line and no `precision` declaration here: three
// prepends its own precision/modelViewMatrix/projectionMatrix prefix for
// GLSL3 ShaderMaterial, and a second `precision` line here would duplicate
// (and can fail to compile against) that prefix. See task-16 brief for the
// deliberate deviation from the brief's literal snippet.
export const cloudVert = /* glsl */ `
  uniform sampler2D uShapeA; uniform sampler2D uShapeB; uniform int uSize;
  uniform mat4 uPoseA; uniform mat4 uPoseB;
  uniform float uT; uniform float uStagger; uniform float uCurl; uniform float uCurlOn; uniform float uCurlFreq;
  uniform float uPointSize; uniform float uPixelRatio; uniform float uFluye; uniform float uFluyeDrop; uniform float uFluyeCurl;
  out float vSeed; out float vTl;
  ${curlGlsl}
  void main() {
    ivec2 ij = ivec2(gl_VertexID % uSize, gl_VertexID / uSize);
    vec4 a = texelFetch(uShapeA, ij, 0); vec4 b = texelFetch(uShapeB, ij, 0);
    vec3 pA = (uPoseA * vec4(a.xyz, 1.)).xyz; vec3 pB = (uPoseB * vec4(b.xyz, 1.)).xyz;
    float tl = smoothstep(0., 1., clamp((uT - a.w * uStagger) / (1. - uStagger), 0., 1.));
    vec3 p = mix(pA, pB, tl);
    float wing = sin(3.14159265 * tl);
    // Tramo 0 "Fluye": caída + curl extra durante el viaje (uFluye = 1 solo en el tramo 0).
    // Ambos términos salen de cloudTokens.fluye (spec §5: "parametrizado por cloudTokens");
    // antes la caída estaba fijada a 0.25 en el shader y los tokens no se usaban.
    // wing = sin(PI*tl): en reposo (tl = 0 o 1) el término de curl vale
    // exactamente 0, así que saltear la evaluación del ruido ahí es un no-op
    // visual que ahorra los 12 samples de curl() por vértice en los dos
    // extremos de cada tramo, que es donde la nube pasa la mayor parte del tiempo.
    if (uCurlOn > 0.5 && wing > 0.001) p += curl(pA * uCurlFreq + a.w * 7.) * (uCurl + uFluye * uFluyeCurl) * wing;
    p.y -= uFluye * uFluyeDrop * wing * (0.6 + 0.4 * a.w);
    vSeed = a.w; vTl = tl;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_PointSize = uPointSize * uPixelRatio * (1. - 0.5 * wing);
    gl_Position = projectionMatrix * mv;
  }`;
