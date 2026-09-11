import { describe, it, expect, vi } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';
vi.mock('./useShapeTextures', () => ({ useShapeTextures: () => ({ get: () => new THREE.DataTexture(new Uint16Array(4 * 4 * 4), 4, 4, THREE.RGBAFormat, THREE.HalfFloatType), ensure: async () => {}, ready: () => true }) }));
// La malla de partícula se carga por GLTF; acá se sustituye por un cubo para
// no pegarle al disco ni al loader en el test.
vi.mock('@react-three/drei', async () => {
  const T = await import('three');
  const scene = new T.Group();
  scene.add(new T.Mesh(new T.BoxGeometry(1, 1, 1)));
  return { useGLTF: Object.assign(() => ({ scene }), { preload: () => {} }) };
});
import { ParticleCloud } from './ParticleCloud';
const manifest = { shapes: {}, sequence: [], tiers: { high: 'lod2', medium: 'lod2', low: 'mobile' } } as never;
describe('ParticleCloud', () => {
  it('monta un <instancedMesh> con N = size² instancias', async () => {
    const r = await ReactThreeTestRenderer.create(<ParticleCloud manifest={manifest} lod="mobile" size={4} reduced={false} curl={false} />);
    // THREE.InstancedMesh no sobreescribe `.type`, así que el renderer de test
    // lo lista como 'Mesh': se comprueba por la bandera y por el conteo.
    const m = r.scene.findByType('Mesh').instance as THREE.InstancedMesh;
    expect(m.isInstancedMesh).toBe(true);
    expect(m.count).toBe(16);
  });
});
