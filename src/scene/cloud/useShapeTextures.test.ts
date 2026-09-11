import { describe, it, expect } from 'vitest';
import { ensureShape, isShapeReady } from './useShapeTextures';
import type { Manifest } from './shapeLoader';

describe('useShapeTextures / ensureShape', () => {
  it('a failed load does not stick: the next ensure re-fetches and becomes ready', async () => {
    const manifest: Manifest = {
      shapes: {
        retry: {
          lod2: { file: '/retry.bin', size: 2, count: 4, bbox: { min: [], max: [] } },
          mobile: { file: '/retry-mobile.bin', size: 2, count: 4, bbox: { min: [], max: [] } },
        },
      },
      sequence: ['retry'],
      tiers: { high: 'lod2', medium: 'lod2', low: 'mobile' },
    };

    const failing = (async () => { throw new Error('network down'); }) as unknown as typeof fetch;
    await expect(ensureShape(manifest, 'lod2', 'retry', failing)).rejects.toThrow();

    const succeeding = (async () => new Response(new Uint16Array(2 * 2 * 4).buffer)) as unknown as typeof fetch;
    await ensureShape(manifest, 'lod2', 'retry', succeeding);

    expect(isShapeReady('retry', 'lod2')).toBe(true);
  });
});
