// Vertex shader for the logo particle field.
//
// Pipeline note (locked decision for this T9 spike): positions come straight
// from logo-lod1.glb's vertex buffer at runtime (variant A in
// docs/architecture/3d-web-standard.md §4) -- no GPGPU compute, no TSL, no
// baked position EXR. That pipeline was explicitly rejected here as overkill
// for a logo-sized (~32k source vertex, capped well below 20k drawn) point
// count.
//
// The logo reads as a still picture at rest (per the "static screen image"
// follow-up): `position` holds each particle's FLAT resting position, on
// the display plane. The simplex noise below is kept ONLY to give each
// particle a fixed, position-derived color tint (see particle.frag.ts) --
// it depends on the flat `position` alone, no time term, so it's computed
// once and never changes frame to frame regardless of `uProgress`.
//
// `explodedPosition` (per-particle attribute, built once in
// displayParticles.ts, in DisplayAnchor-local space) is where a particle
// goes once fully dispersed behind the Device. `uProgress` (0..1, driven
// by scroll -- see HeroCentralScene.tsx) mixes between the two POSITIONS
// only; it is not "motion" in its own right, and both base positions are
// fixed at setup time, never recomputed here.
export const particleVertexShader = /* glsl */ `
  uniform float uProgress;
  uniform float uFrequency;
  uniform float uSize;
  uniform float uPixelRatio;

  // Dissolve lab (T12 exploration): which choreography uProgress drives.
  //   0 = explode back behind the device (original T9 behaviour)
  //   1 = dust: erodes bottom-up, particles drift upward and fade
  //   2 = radial burst in the screen plane, fading outward
  //   3 = stream: flows down/forward out of the screen toward the next section
  // Chosen at runtime (dissolveLab.ts) so variants can be compared live.
  uniform float uMode;
  // Dispersion budget in DisplayAnchor-local units: (screen width, screen height, device maxDim).
  uniform vec3 uSpread;

  attribute vec3 explodedPosition;
  attribute float aSeed;

  varying float vNoise;
  varying float vFade;

  // Simplex 3D noise, Ian McEwan / Ashima Arts (webgl-noise, MIT license).
  // Public-domain-equivalent, widely reused implementation -- not an asset,
  // just inlined math. Used here purely for a fixed, per-particle color
  // seed (see main() below), not for any motion.
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  void main() {
    // Fixed per-particle color seed -- the FLAT position only, no time
    // term, so every particle keeps exactly the same tint at every
    // uProgress value, on every frame, forever.
    vNoise = snoise(position * uFrequency * 1.7);

    // The only thing that varies here: a mix between two positions that
    // were both computed once, at setup. Not a recomputation, not a
    // continuous animation -- a single lerp driven by uProgress.
    vec3 displayPosition = position;
    float fade = 1.0;
    float shrink = 0.0;

    if (uMode < 0.5) {
      // 0: original -- single lerp toward the pre-computed exploded target.
      float eased = smoothstep(0.0, 1.0, uProgress);
      displayPosition = mix(position, explodedPosition, eased);
    } else if (uMode < 1.5) {
      // 1: dust. Bottom rows leave first (order by height), each particle
      // with its own small delay, then drifts up and slightly sideways.
      float order = 0.5 - position.y / max(uSpread.y, 1e-5); // ~0 top .. ~1 bottom
      float local = clamp((uProgress * 1.6 - order * 0.45 - aSeed * 0.15) / 0.55, 0.0, 1.0);
      float e = local * local;
      vec3 drift = vec3((aSeed - 0.5) * uSpread.x * 0.6, uSpread.y * (0.9 + aSeed * 0.5), uSpread.z * 0.15 * (aSeed - 0.5));
      displayPosition = position + drift * e;
      fade = 1.0 - local;
      shrink = local;
    } else if (uMode < 2.5) {
      // 2: radial burst. Outer particles leave first, all fly outward in
      // the screen plane and fade.
      vec2 dir = position.xy;
      float r = length(dir) / max(uSpread.y * 0.5, 1e-5);
      dir = r > 1e-5 ? normalize(dir) : vec2(0.0, 1.0);
      float local = clamp((uProgress * 1.5 - (1.0 - r) * 0.35 - aSeed * 0.15) / 0.6, 0.0, 1.0);
      float e = local * local;
      displayPosition = position + vec3(dir * uSpread.x * (0.8 + aSeed * 0.6) * e, uSpread.z * 0.3 * e);
      fade = 1.0 - local * local;
      shrink = local * 0.7;
    } else {
      // 3: stream. Everything peels off the screen and flows down and
      // forward (toward the camera / next section), with a lazy curl.
      float local = clamp((uProgress * 1.4 - aSeed * 0.4) / 0.7, 0.0, 1.0);
      float e = local * local;
      float curl = sin(aSeed * 6.2831 + local * 3.0) * uSpread.x * 0.25;
      displayPosition = position + vec3(uSpread.x * 0.5 * e + curl * local, -uSpread.y * 1.6 * e, uSpread.z * 0.9 * e);
      fade = 1.0 - smoothstep(0.55, 1.0, local);
      shrink = local * 0.5;
    }

    vFade = fade;
    vec4 mvPosition = modelViewMatrix * vec4(displayPosition, 1.0);

    // Flat pixel size, deliberately NOT attenuated by view-space depth.
    // The usual size-over-distance attenuation assumes "normal" scene
    // units (roughly 1-10); this model is authored in real-world meters
    // (~0.17 units for the whole device), so at the actual camera
    // distance that formula inflated points to thousands of pixels each --
    // that's what was flooding the canvas white. The camera here is
    // static (no zoom/dolly), so a flat size is correct, not a hack.
    gl_PointSize = uSize * uPixelRatio * (1.0 - 0.6 * shrink);
    gl_Position = projectionMatrix * mvPosition;
  }
`;
