import { describe, it, expect, vi } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';
vi.mock('./useShapeTextures', () => ({ useShapeTextures: () => ({ get: () => new THREE.DataTexture(new Uint16Array(4 * 4 * 4), 4, 4, THREE.RGBAFormat, THREE.HalfFloatType), getParams: () => undefined, getLinks: () => undefined, ensure: async () => {}, ready: () => true }) }));
import { ParticleCloud } from './ParticleCloud';
const manifest = { shapes: {}, sequence: [], tiers: { high: 'lod2', medium: 'lod2', low: 'mobile' } } as never;
describe('ParticleCloud', () => {
  it('mounts surface points and two networks without per-particle meshes', async () => {
    const r = await ReactThreeTestRenderer.create(<ParticleCloud manifest={manifest} lod="mobile" size={4} reduced={false} curl={false} />);
    const points = r.scene.findByType('Points').instance as THREE.Points;
    expect(points.geometry.getAttribute('position').count).toBe(16);
    expect(r.scene.findAllByType('LineSegments')).toHaveLength(2);
    await r.unmount();
  });
});
