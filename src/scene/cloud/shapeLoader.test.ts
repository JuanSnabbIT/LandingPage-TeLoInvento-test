import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { bufferToTexture, loadShape } from './shapeLoader';
describe('shapeLoader', () => {
  it('bufferToTexture: half-float RGBA, nearest, tamaño correcto', () => {
    const size = 2; const buf = new Uint16Array(size * size * 4).buffer;
    const t = bufferToTexture(buf, size);
    expect(t.type).toBe(THREE.HalfFloatType); expect(t.format).toBe(THREE.RGBAFormat);
    expect(t.magFilter).toBe(THREE.NearestFilter); expect(t.image.width).toBe(2); expect(t.flipY).toBe(false);
  });
  it('loadShape rechaza si el tamaño no coincide', async () => {
    const fetchImpl = (async () => new Response(new Uint16Array(3).buffer)) as unknown as typeof fetch;
    await expect(loadShape({ file: '/x.bin', size: 2, count: 4, bbox: { min: [], max: [] } }, fetchImpl)).rejects.toThrow(/size/);
  });
});
