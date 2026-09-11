import { curlGlsl } from './curl.glsl';

// GLSL3 vertex shader for the stateless particle-cloud morph (T16).
// Consumed via ShaderMaterial({ glslVersion: THREE.GLSL3 }), which is why
// there's no `#version` line and no `precision` declaration here: three
// prepends its own precision/modelViewMatrix/projectionMatrix prefix for
// GLSL3 ShaderMaterial, and a second `precision` line here would duplicate
// (and can fail to compile against) that prefix.
//
// La nube se dibuja con `InstancedMesh`: una malla chica (public/particles/
// py-*.glb, la que entregó el dueño del proyecto) por partícula, en vez de un
// GL_POINT plano. Por eso el índice de partícula sale de `gl_InstanceID` y no
// de `gl_VertexID`, y `position`/`normal` son los del vértice de esa malla --
// three declara ambos atributos en su prefijo de ShaderMaterial.
//
// Dos técnicas tomadas del sitio Dala (ingeniería inversa de su bundle, ver
// docs/architecture/3d-web-standard.md §5.1):
//   1. el TAMAÑO de cada partícula sale horneado de la geometría, no calculado
//      en vivo: chico pegado a una arista viva, grande en el centro de una cara;
//   2. cada partícula MIRA A LA CÁMARA (matriz look-at por instancia) con un
//      giro propio sobre ese eje, en vez de una rotación fija al azar.
export const cloudVert = /* glsl */ `
  uniform sampler2D uShapeA; uniform sampler2D uShapeB; uniform int uSize;
  // Parámetros por partícula (RGBA8, mismo índice de píxel que las posiciones):
  // RGB = color horneado de la pieza, A = cercanía a arista viva (0 = pegada a
  // una arista, 1 = centro de una cara abierta). Las DOS puntas del morph
  // tienen su textura: con solo la punta A, entrar a una forma de color la
  // dejaba teñida del azul de producto hasta que cambiaba el tramo, y ahí el
  // color aparecía de golpe. uHasColorX = 0 -> esa punta cae al degradado por
  // seed (uColorLogoA/B), que es la red de seguridad si el .bin no carga.
  uniform sampler2D uParamsA; uniform sampler2D uParamsB;
  uniform float uHasColorA; uniform float uHasColorB;
  uniform float uTintA; uniform float uTintB;
  uniform vec3 uColorLogoA; uniform vec3 uColorLogoB;
  uniform mat4 uPoseA; uniform mat4 uPoseB;
  uniform float uT; uniform float uStagger; uniform float uCurl; uniform float uCurlOn; uniform float uCurlFreq;
  uniform float uParticleScale; uniform float uFluye; uniform float uFluyeDrop; uniform float uFluyeCurl;
  // Centro del modelo (mundo) y su semi-tamaño: con esos dos se sabe qué
  // partículas quedan detrás, para bajarles la opacidad.
  uniform vec3 uCenter; uniform float uSpan;
  // Rango de tamaño: el horneado guarda el FACTOR (la cercanía a arista) y acá
  // se convierte en tamaño, así se re-encuadra sin volver a hornear.
  uniform float uEdgeScale; uniform float uFaceScale; uniform float uBackAlpha;
  uniform float uSpin; uniform float uOrientNoise; uniform float uBillboard;
  // Resorte amortiguado: cada partícula no interpola en línea recta hacia su
  // destino, lo sobrepasa un poco y se asienta. Es la respuesta analítica del
  // oscilador, no una simulación: la escena sigue siendo función pura del
  // scroll, así que scrollear hacia atrás deshace el movimiento exacto.
  uniform float uSpringOmega; uniform float uSpringZeta;
  uniform float uSwirl; uniform float uSwirlRadius; uniform float uSwirlTurns;
  out float vSeed; out float vTl; out vec3 vColor; out float vTint; out float vShade; out float vFade;
  ${curlGlsl}

  /**
   * Respuesta de un resorte amortiguado a un escalón, normalizada a [0,1] en el
   * recorrido: arranca en 0, sobrepasa 1 según el amortiguamiento y termina en 1.
   * zeta < 1 da sobrepaso; omega es cuán rápido se asienta.
   */
  float springEase(float x, float omega, float zeta) {
    float c = clamp(x, 0., 1.);
    float wd = omega * sqrt(max(1. - zeta * zeta, 1e-4));
    float e = exp(-zeta * omega * c);
    return 1. - e * (cos(wd * c) + (zeta * omega / wd) * sin(wd * c));
  }

  /**
   * Base ortonormal que mira de origin a target, con un giro roll alrededor de
   * ese eje: el equivalente del calcLookAtMatrix de Dala, que en su versión
   * mobile hace que cada pirámide encare a la cámara.
   */
  mat3 lookAtRoll(vec3 origin, vec3 target, float roll) {
    vec3 z = normalize(target - origin);
    vec3 h = abs(z.y) > 0.95 ? vec3(1., 0., 0.) : vec3(0., 1., 0.);
    vec3 x = normalize(cross(h, z));
    vec3 y = cross(z, x);
    float c = cos(roll), s = sin(roll);
    return mat3(x * c + y * s, y * c - x * s, z);
  }

  /** Rotación de angle alrededor de un eje unitario (Rodrigues). */
  mat3 axisAngle(vec3 axis, float angle) {
    float s = sin(angle), c = cos(angle), t = 1. - c;
    return mat3(
      t * axis.x * axis.x + c,          t * axis.x * axis.y + s * axis.z, t * axis.x * axis.z - s * axis.y,
      t * axis.x * axis.y - s * axis.z, t * axis.y * axis.y + c,          t * axis.y * axis.z + s * axis.x,
      t * axis.x * axis.z + s * axis.y, t * axis.y * axis.z - s * axis.x, t * axis.z * axis.z + c);
  }

  void main() {
    int id = gl_InstanceID;
    ivec2 ij = ivec2(id % uSize, id / uSize);
    vec4 a = texelFetch(uShapeA, ij, 0); vec4 b = texelFetch(uShapeB, ij, 0);
    vec4 prA = texelFetch(uParamsA, ij, 0); vec4 prB = texelFetch(uParamsB, ij, 0);
    vec3 pA = (uPoseA * vec4(a.xyz, 1.)).xyz; vec3 pB = (uPoseB * vec4(b.xyz, 1.)).xyz;
    // Progreso propio de la partícula. uStagger alto (0.8+) convierte el
    // tramo en una ONDA que barre la nube -- cada partícula cruza rápido, pero
    // el conjunto tarda todo el tramo -- en vez de mover el bloque entero a la
    // vez, que es lo que se veía antes.
    float tRaw = clamp((uT - a.w * uStagger) / (1. - uStagger), 0., 1.);
    float tl = springEase(tRaw, uSpringOmega, uSpringZeta);   // puede pasar de 1: es el sobrepaso
    float tc = clamp(tl, 0., 1.);                             // para mezclar color y tamaño
    vec3 p = mix(pA, pB, tl);
    // La envolvente del vuelo (curl, giro, achique) sigue al progreso CRUDO: con
    // el del resorte, el sobrepaso la haría negativa justo al final.
    float wing = sin(3.14159265 * tRaw);
    // Tramo 0 "Fluye": caída + curl extra durante el viaje (uFluye = 1 solo en el tramo 0).
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
    if (uSwirl > 0.5 && wing > 0.001) {
      vec3 d = pB - pA;
      float len = length(d);
      if (len > 1e-4) {
        vec3 ax = d / len;
        vec3 h = abs(ax.y) > 0.9 ? vec3(1., 0., 0.) : vec3(0., 1., 0.);
        vec3 ru = normalize(cross(ax, h));
        vec3 rv = cross(ax, ru);
        float ang = a.w * 6.2831853 + tRaw * 6.2831853 * uSwirlTurns;
        float rad = uSwirlRadius * wing * (0.35 + 0.65 * a.w);
        p += (ru * cos(ang) + rv * sin(ang)) * rad;
      }
    }
    vSeed = a.w; vTl = tc;
    // El color viaja con la MISMA rampa escalonada que la posición (tl, no uT):
    // cada partícula toma el color de su destino cuando ella llega, no cuando
    // llega el promedio de la nube.
    vec3 fb = mix(uColorLogoA, uColorLogoB, a.w);
    vec3 cA = uHasColorA > 0.5 ? prA.rgb : fb;
    vec3 cB = uHasColorB > 0.5 ? prB.rgb : fb;
    vColor = mix(cA, cB, tc);
    vTint = mix(uTintA, uTintB, tc);
    // Tamaño horneado: el canal A trae la cercanía a arista viva de ESTA forma,
    // y viaja entre las dos puntas igual que el color. En el borde la partícula
    // es chica (y el horneado además puso más partículas ahí, así que quedan
    // juntas y la silueta se lee nítida); en el centro de una cara es grande y
    // el interior respira.
    float edgeK = mix(prA.a, prB.a, tc);
    float sc = uParticleScale * mix(uEdgeScale, uFaceScale, edgeK);
    // Las de atrás: más chicas y, en el fragment, más tenues.
    vec4 mvCenter = modelViewMatrix * vec4(p, 1.);
    float centerZ = (modelViewMatrix * vec4(uCenter, 1.)).z;
    float back = clamp((centerZ - mvCenter.z) / max(uSpan, 1e-4), 0., 1.);
    vFade = mix(1., uBackAlpha, back);
    sc *= mix(1., 0.8, back) * (1. - 0.25 * wing);
    // Orientación de la pirámide. Dala usa dos modos y en ESCRITORIO elige el de
    // ruido: giro alrededor del eje fijo (0,1,1) con el ángulo sacado de un
    // simplex de la posición, lo que da siluetas variadas y textura cristalina.
    // (En el original el ángulo además avanza con el tiempo; acá no, porque la
    // escena sólo dibuja cuando algo cambia y una rotación continua obligaría a
    // dibujar siempre.) El billboard --su modo mobile-- queda disponible por
    // token: todas las caras miran a la cámara y la nube se lee más pareja.
    float nOrient = snoise(a.xyz * uOrientNoise) * 3.1415926 + a.w * 6.2831853 * uSpin;
    mat3 rot = uBillboard > 0.5
      ? lookAtRoll(p, cameraPosition, nOrient)
      : axisAngle(normalize(vec3(0., 1., 1.)), nOrient);
    vec3 world = p + rot * position * sc;
    // Sombreado plano por cara: aunque la pirámide encare a la cámara, sus
    // caras laterales caen a distinto ángulo, así que la luz sigue dando relieve.
    vec3 nw = normalize(rot * normal);
    vShade = 0.42 + 0.58 * max(dot(nw, normalize(vec3(0.35, 0.8, 0.55))), 0.);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.);
  }`;
