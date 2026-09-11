import { describe, it, expect, vi, afterEach } from 'vitest';
import { ensureShape, isShapeReady, RETRY_COOLDOWN_MS } from './useShapeTextures';
import type { Manifest } from './shapeLoader';

const entry = (file: string) => ({ file, size: 2, count: 4, bbox: { min: [], max: [] } });
const manifest = (name: string): Manifest => ({
  shapes: { [name]: { lod2: entry(`/${name}.bin`), mobile: entry(`/${name}-mobile.bin`) } },
  sequence: [name],
  tiers: { high: 'lod2', medium: 'lod2', low: 'mobile' },
});

/** `loadShape` only needs a Response whose body is the expected byte length. */
const ok = () => (async () => new Response(new Uint16Array(2 * 2 * 4).buffer)) as unknown as typeof fetch;

afterEach(() => { vi.restoreAllMocks(); });

describe('useShapeTextures / ensureShape', () => {
  it('a failed load does not stick: once the cooldown expires the next ensure re-fetches and becomes ready', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(0);
    const failing = (async () => { throw new Error('network down'); }) as unknown as typeof fetch;
    await expect(ensureShape(manifest('retry'), 'lod2', 'retry', failing)).rejects.toThrow();

    now.mockReturnValue(RETRY_COOLDOWN_MS + 1);
    await ensureShape(manifest('retry'), 'lod2', 'retry', ok());

    expect(isShapeReady('retry', 'lod2')).toBe(true);
  });

  it('a failure opens a cooldown: repeated ensures inside it do not re-fetch (no fetch storm from useFrame)', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    let fetches = 0;
    const failing = (async () => { fetches++; throw new Error('404'); }) as unknown as typeof fetch;
    const m = manifest('storm');

    await expect(ensureShape(m, 'lod2', 'storm', failing)).rejects.toThrow();
    expect(fetches).toBe(1);

    // Second call well inside the 5 s window: resolves without touching the network.
    vi.spyOn(Date, 'now').mockReturnValue(1_000 + RETRY_COOLDOWN_MS - 1);
    await expect(ensureShape(m, 'lod2', 'storm', failing)).resolves.toBeUndefined();
    expect(fetches).toBe(1);
  });

  it('a shape missing from the manifest resolves instead of throwing into useFrame', async () => {
    const m = manifest('present');
    await expect(ensureShape(m, 'lod2', 'ausente', ok())).resolves.toBeUndefined();
    expect(isShapeReady('ausente', 'lod2')).toBe(false);
  });
});
