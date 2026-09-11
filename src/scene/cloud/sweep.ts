import * as THREE from 'three';

/**
 * Rango del barrido: en qué orden cruzan las partículas durante un tramo.
 *
 * El sitio de referencia ordena sus partículas en CPU por un eje distinto en
 * cada transición y guarda el rango de cada una. Acá se calcula en el shader
 * proyectando la posición de la partícula sobre la dirección del tramo, así que
 * lo que hay que preparar en JS son dos cosas:
 *
 *  1. la dirección del barrido en espacio de OBJETO (la forma horneada), no de
 *     mundo. El rango tiene que depender sólo de la partícula y del tramo:
 *     proyectar contra algo que se mueve con el progreso —el centro
 *     interpolado, por ejemplo— hace que el orden cambie mientras la
 *     transición corre, que es justo lo que arruina la ola;
 *  2. el factor que normaliza esa proyección al ancho real de la forma sobre
 *     ese eje. Las posiciones horneadas se normalizan dividiendo por la
 *     extensión MÁXIMA, así que un eje corto ocupa mucho menos que [-1, 1] y
 *     sin corregirlo el rango se aplasta contra el medio y media forma arranca
 *     a la vez.
 */
export interface SweepFrame {
  /** Dirección del barrido en espacio de la forma, unitaria. */
  dir: THREE.Vector3;
  /** 1 / (2 · semi-extensión de la forma sobre esa dirección). */
  scale: number;
}

const tmpM = new THREE.Matrix3();
const tmpV = new THREE.Vector3();

/**
 * @param pose   matriz de la pose activa (rotación + escala uniforme + traslación)
 * @param world  dirección del barrido en mundo (no hace falta que sea unitaria)
 * @param half   semi-extensiones de la forma YA normalizada, por eje (el eje
 *               mayor vale 1; los otros, su proporción)
 */
export function sweepFrame(pose: THREE.Matrix4, world: [number, number, number], half: THREE.Vector3, out?: SweepFrame): SweepFrame {
  const r = out ?? { dir: new THREE.Vector3(), scale: 0.5 };
  // La pose es rotación · escala uniforme: transponer su parte 3x3 y normalizar
  // equivale a invertir la rotación, sin importar la escala.
  tmpM.setFromMatrix4(pose).transpose();
  r.dir.set(world[0], world[1], world[2]).applyMatrix3(tmpM);
  if (r.dir.lengthSq() < 1e-12) r.dir.set(0, -1, 0);
  r.dir.normalize();
  // Semi-extensión sobre esa dirección: exacta para un eje, cota superior para
  // una diagonal. De más es preferible a de menos -- comprime el rango hacia el
  // centro en vez de saturarlo en los extremos.
  const ext = Math.abs(r.dir.x) * half.x + Math.abs(r.dir.y) * half.y + Math.abs(r.dir.z) * half.z;
  r.scale = 1 / (2 * Math.max(ext, 1e-3));
  return r;
}

/** Semi-extensiones por eje de una forma horneada, a partir del bbox de su `.json`. */
export function normalizedHalfExtents(bbox: { min: number[]; max: number[] }, out?: THREE.Vector3): THREE.Vector3 {
  const v = out ?? new THREE.Vector3();
  const ex = bbox.max[0] - bbox.min[0];
  const ey = bbox.max[1] - bbox.min[1];
  const ez = bbox.max[2] - bbox.min[2];
  const m = Math.max(ex, ey, ez, 1e-6);
  return v.set(ex / m, ey / m, ez / m);
}

/** Centro de una pose (su traslación), sin alocar. */
export function poseCenter(pose: THREE.Matrix4, out: THREE.Vector3): THREE.Vector3 {
  return out.setFromMatrixPosition(pose);
}

/** Escala uniforme de una pose. */
export function poseScale(pose: THREE.Matrix4): number {
  const e = pose.elements;
  return Math.hypot(e[0], e[1], e[2]);
}

/** Reexport interno para los tests: evita que tmpV quede sin uso en builds. */
export const _tmp = tmpV;
