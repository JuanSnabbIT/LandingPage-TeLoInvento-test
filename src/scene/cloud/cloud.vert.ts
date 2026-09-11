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
  // Color por partícula (RGBA8, mismo índice de píxel que las posiciones). Lo
  // traen las formas horneadas con \`colors\`: el logo (rayos amarillos, ampolleta
  // cian, base navy, llama ámbar) y la fila de Capacidades (aspersor, baliza con
  // escudo, microchip). Las DOS puntas del morph tienen su textura y su peso:
  // con solo la punta A, entrar a una forma de color la dejaba teñida del azul
  // de producto hasta que el tramo cambiaba, y ahí el color aparecía de golpe.
  // uHasColorX = 0 → esa punta cae al degradado por seed (uColorLogoA/B), que
  // es también la red de seguridad si el .bin de color no carga.
  // uTintX = 1 → esa punta se pinta con su color horneado; 0 → color de producto.
  uniform sampler2D uColorA; uniform sampler2D uColorB;
  uniform float uHasColorA; uniform float uHasColorB;
  uniform float uTintA; uniform float uTintB;
  uniform vec3 uColorLogoA; uniform vec3 uColorLogoB;
  uniform mat4 uPoseA; uniform mat4 uPoseB;
  uniform float uT; uniform float uStagger; uniform float uCurl; uniform float uCurlOn; uniform float uCurlFreq;
  uniform float uPointSize; uniform float uPixelRatio; uniform float uFluye; uniform float uFluyeDrop; uniform float uFluyeCurl;
  uniform float uSwirl; uniform float uSwirlRadius; uniform float uSwirlTurns;
  out float vSeed; out float vTl; out vec3 vColor; out float vTint;
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
    // Giro en vuelo: cada partícula orbita el eje que une su origen con su
    // destino, con la fase sacada de su semilla y el radio modulado por wing
    // (0 en los dos extremos). Así el enjambre sale en espiral, se abre a mitad
    // de camino y aterriza EXACTO sobre el destino, sin desvío residual.
    // uSwirl lo enciende sólo en los tramos de viaje: en un morph en sitio el
    // eje sería el desplazamiento minúsculo de cada pieza y el giro no leería.
    if (uSwirl > 0.5 && wing > 0.001) {
      vec3 d = pB - pA;
      float len = length(d);
      if (len > 1e-4) {
        vec3 ax = d / len;
        // Base perpendicular estable: el vector auxiliar se elige lejos del eje
        // para que el producto cruz no degenere cuando el viaje es vertical.
        vec3 h = abs(ax.y) > 0.9 ? vec3(1., 0., 0.) : vec3(0., 1., 0.);
        vec3 ru = normalize(cross(ax, h));
        vec3 rv = cross(ax, ru);
        float ang = a.w * 6.2831853 + tl * 6.2831853 * uSwirlTurns;
        float rad = uSwirlRadius * wing * (0.35 + 0.65 * a.w);
        p += (ru * cos(ang) + rv * sin(ang)) * rad;
      }
    }
    vSeed = a.w; vTl = tl;
    // El color viaja con la MISMA rampa escalonada que la posición (tl, no uT):
    // cada partícula toma el color de su destino cuando ella llega, no cuando
    // llega el promedio de la nube.
    vec3 fb = mix(uColorLogoA, uColorLogoB, a.w);
    vec3 cA = uHasColorA > 0.5 ? texelFetch(uColorA, ij, 0).rgb : fb;
    vec3 cB = uHasColorB > 0.5 ? texelFetch(uColorB, ij, 0).rgb : fb;
    vColor = mix(cA, cB, tl);
    vTint = mix(uTintA, uTintB, tl);
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_PointSize = uPointSize * uPixelRatio * (1. - 0.5 * wing);
    gl_Position = projectionMatrix * mv;
  }`;
