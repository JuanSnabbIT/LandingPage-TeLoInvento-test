import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { sweepFrame, normalizedHalfExtents, poseScale } from './sweep';

const pose = (euler: [number, number, number], scale: number, pos: [number, number, number]) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...euler, 'XYZ')),
    new THREE.Vector3(scale, scale, scale),
  );

describe('sweepFrame', () => {
  it('el rango NO depende del progreso: sólo de la pose y la dirección', () => {
    // Regresión del bug encontrado en la revisión: la primera versión proyectaba
    // contra el centro INTERPOLADO del modelo, así que el orden de las
    // partículas cambiaba mientras corría la transición y la ola se deshacía.
    // La dirección de barrido tiene que salir de la rotación de la pose y nada
    // más -- mover la pose de sitio no puede cambiarla.
    const half = new THREE.Vector3(1, 0.5, 0.5);
    const a = sweepFrame(pose([0.25, 0.5, 0], 3, [0, 0, 0]), [1, 0, 0], half);
    const b = sweepFrame(pose([0.25, 0.5, 0], 3, [120, -80, 5]), [1, 0, 0], half);
    expect(a.dir.x).toBeCloseTo(b.dir.x, 10);
    expect(a.dir.y).toBeCloseTo(b.dir.y, 10);
    expect(a.dir.z).toBeCloseTo(b.dir.z, 10);
    expect(a.scale).toBeCloseTo(b.scale, 10);
  });

  it('tampoco depende de la escala de la pose', () => {
    const half = new THREE.Vector3(1, 0.5, 0.5);
    const chica = sweepFrame(pose([0.25, 0.5, 0], 0.4, [0, 0, 0]), [0, -1, 0], half);
    const grande = sweepFrame(pose([0.25, 0.5, 0], 40, [0, 0, 0]), [0, -1, 0], half);
    expect(chica.dir.y).toBeCloseTo(grande.dir.y, 10);
    expect(chica.scale).toBeCloseTo(grande.scale, 10);
  });

  it('sin rotación, la dirección de mundo pasa tal cual y es unitaria', () => {
    const f = sweepFrame(pose([0, 0, 0], 2, [0, 0, 0]), [0, -3, 0], new THREE.Vector3(1, 1, 1));
    expect(f.dir.toArray().map((v) => +v.toFixed(6))).toEqual([0, -1, 0]);
    expect(f.scale).toBeCloseTo(0.5, 6);
  });

  it('deshace la rotación de la pose: un barrido vertical en pantalla mira al eje del objeto', () => {
    // Con yaw puro, el "abajo" de la pantalla sigue siendo el -Y del objeto.
    const f = sweepFrame(pose([0, 0.9, 0], 1, [0, 0, 0]), [0, -1, 0], new THREE.Vector3(1, 1, 1));
    expect(f.dir.y).toBeCloseTo(-1, 6);
    // Con pitch puro, en cambio, se reparte entre Y y Z del objeto.
    const g = sweepFrame(pose([0.6, 0, 0], 1, [0, 0, 0]), [0, -1, 0], new THREE.Vector3(1, 1, 1));
    expect(Math.abs(g.dir.y)).toBeLessThan(1);
    expect(Math.abs(g.dir.z)).toBeGreaterThan(0.1);
    expect(g.dir.length()).toBeCloseTo(1, 6);
  });

  it('un eje corto normaliza más fuerte, así el rango usa todo [0,1]', () => {
    // La forma `wifi` es 2.00 x 1.46 x 0.37 normalizada: barrerla por su eje
    // corto con el mismo factor que por el largo aplastaría el rango contra el
    // medio y media forma arrancaría a la vez.
    const half = new THREE.Vector3(1, 0.73, 0.185);
    const largo = sweepFrame(pose([0, 0, 0], 1, [0, 0, 0]), [1, 0, 0], half);
    const corto = sweepFrame(pose([0, 0, 0], 1, [0, 0, 0]), [0, 0, 1], half);
    expect(largo.scale).toBeCloseTo(0.5, 6);
    expect(corto.scale).toBeCloseTo(1 / (2 * 0.185), 6);
    expect(corto.scale).toBeGreaterThan(largo.scale * 2);
  });

  it('una dirección degenerada cae a un barrido vertical en vez de romper', () => {
    const f = sweepFrame(pose([0, 0, 0], 1, [0, 0, 0]), [0, 0, 0], new THREE.Vector3(1, 1, 1));
    expect(f.dir.length()).toBeCloseTo(1, 6);
    expect(Number.isFinite(f.scale)).toBe(true);
  });
});

describe('normalizedHalfExtents', () => {
  it('el eje mayor vale 1 y los otros su proporción', () => {
    const h = normalizedHalfExtents({ min: [-1, -0.5, -0.2], max: [1, 0.5, 0.2] });
    expect(h.x).toBeCloseTo(1, 6);
    expect(h.y).toBeCloseTo(0.5, 6);
    expect(h.z).toBeCloseTo(0.2, 6);
  });
  it('no divide por cero con una forma plana', () => {
    const h = normalizedHalfExtents({ min: [0, 0, 0], max: [0, 0, 0] });
    expect(Number.isFinite(h.x)).toBe(true);
  });
});

describe('poseScale', () => {
  it('devuelve la escala uniforme, con o sin rotación', () => {
    expect(poseScale(pose([0, 0, 0], 7, [0, 0, 0]))).toBeCloseTo(7, 6);
    expect(poseScale(pose([0.3, 1.1, -0.4], 7, [10, 2, 3]))).toBeCloseTo(7, 6);
  });
});
