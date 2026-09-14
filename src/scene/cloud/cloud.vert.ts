import { curlGlsl } from './curl.glsl';

// Points and topology links share exactly the same stateless morph.
export const cloudVert = /* glsl */ `
  uniform sampler2D uShapeA, uShapeB, uParamsA, uParamsB;
  uniform int uSize;
  uniform mat4 uPoseA, uPoseB;
  uniform vec3 uCenterA, uCenterB, uSweepDir, uColorLogoA, uColorLogoB;
  uniform float uHasColorA, uHasColorB, uTintA, uTintB;
  uniform float uT, uStagger, uSweepScale, uSweepJitter;
  uniform float uCurl, uCurlOn, uCurlFreq, uSpread, uSpan;
  uniform float uParticleScale, uEdgeScale, uFaceScale, uSizeJitter, uBackAlpha;
  uniform float uSwirl, uSwirlRadius, uSwirlTurns;
  uniform float uViewportHeight, uPixelRatio, uNetworkRole;
  uniform float uRigid;
  #ifdef SURFACE_LINES
    in float particleIndex;
  #endif
  out vec3 vColor;
  out float vTint, vFade, vNetwork;
  ${curlGlsl}
  void main() {
    #ifdef SURFACE_LINES
      int id = int(particleIndex);
    #else
      int id = gl_VertexID;
    #endif
    ivec2 ij = ivec2(id % uSize, id / uSize);
    vec4 a = texelFetch(uShapeA, ij, 0), b = texelFetch(uShapeB, ij, 0);
    vec4 ca = texelFetch(uParamsA, ij, 0), cb = texelFetch(uParamsB, ij, 0);
    float rank = clamp(.5 + dot(a.xyz, uSweepDir) * uSweepScale, 0., 1.);
    float order = mix(rank, a.w, uSweepJitter);
    float local = clamp((uT - order * uStagger) / (1. - uStagger), 0., 1.);
    // Exact endpoints: no residual spring displacement or time-driven settling.
    float t = local * local * (3. - 2. * local);
    float wing = sin(3.14159265 * local);
    vec3 pa = (uPoseA * vec4(a.xyz, 1.)).xyz;
    vec3 pb = (uPoseB * vec4(b.xyz, 1.)).xyz;
    vec3 center = mix(uCenterA, uCenterB, t);
    vec3 p = center + (mix(pa, pb, t) - center) * uSpread;
    if (uCurlOn > .5 && wing > .001)
      p += curl(a.xyz * uCurlFreq + a.w * 7.) * uCurl * uSpan * wing;
    if (uSwirl > .5 && wing > .001) {
      vec3 d = pb - pa;
      if (length(d) > .0001) {
        vec3 axis = normalize(d);
        vec3 h = abs(axis.y) > .9 ? vec3(1.,0.,0.) : vec3(0.,1.,0.);
        vec3 x = normalize(cross(axis, h)), y = cross(axis, x);
        float angle = a.w * 6.2831853 + local * 6.2831853 * uSwirlTurns;
        p += (x * cos(angle) + y * sin(angle)) * uSwirlRadius * uSpan * wing;
      }
    }
    vec3 fallback = mix(uColorLogoA, uColorLogoB, a.w);
    vColor = mix(uHasColorA > .5 ? ca.rgb : fallback, uHasColorB > .5 ? cb.rgb : fallback, t);
    vTint = mix(uTintA, uTintB, t);
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    float centerZ = (modelViewMatrix * vec4(center, 1.)).z;
    float depth = smoothstep(-.7, .6, (mv.z-centerZ) / max(uSpan, .0001));
    vFade = mix(uBackAlpha, 1., depth);
    // Networks disappear before their edges stretch, and return after arrival.
    vNetwork = uNetworkRole < .5 ? 1. - smoothstep(0., .12, uT) : smoothstep(.88, 1., uT);
    if (uRigid > .5) vNetwork = uNetworkRole < .5 ? 1. : 0.;
    float detail = mix(ca.a, cb.a, t);
    float diameter = uParticleScale * mix(uEdgeScale, uFaceScale, detail);
    diameter *= 1. - uSizeJitter + 2. * uSizeJitter * a.w;
    gl_PointSize = clamp(diameter * uViewportHeight * projectionMatrix[1][1] / max(-mv.z, .001), 1.35, 3.2) * uPixelRatio;
    gl_Position = projectionMatrix * mv;
  }
`;
