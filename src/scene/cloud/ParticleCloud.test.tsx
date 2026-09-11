import { describe, it, expect, vi } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';
vi.mock('./useShapeTextures', () => ({ useShapeTextures: () => ({ get: () => new THREE.DataTexture(new Uint16Array(4 * 4 * 4), 4, 4, THREE.RGBAFormat, THREE.HalfFloatType), ensure: async () => {}, ready: () => true }) }));
import { ParticleCloud } from './ParticleCloud';
const manifest = { shapes: {}, sequence: [], tiers: { high: 'lod2', medium: 'lod2', low: 'mobile' } } as never;
describe('ParticleCloud', () => {
  it('monta un <points> con N = size²', async () => {
    const r = await ReactThreeTestRenderer.create(<ParticleCloud manifest={manifest} lod="mobile" size={4} reduced={false} curl={false} />);
    const pts = r.scene.findByType('Points'); expect((pts.instance as THREE.Points).geometry.getAttribute('position').count).toBe(16);
  });
});
