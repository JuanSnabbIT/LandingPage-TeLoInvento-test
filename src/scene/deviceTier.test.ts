import { describe, it, expect } from 'vitest';
import { getDeviceTier } from './deviceTier';
describe('deviceTier v2', () => {
  it.each([
    [1440, 8, 'high', 'lod2', 2, true],
    [1024, 8, 'high', 'lod2', 2, true],
    [900, 4, 'medium', 'lod2', 1.5, true],
    [390, 8, 'low', 'mobile', 1, false],
    [1440, 2, 'low', 'mobile', 1, false],
  ])('%i px / %i cores → %s', (width, cores, tier, lod, dprMax, curl) => {
    const t = getDeviceTier({ width, cores });
    expect(t).toMatchObject({ tier, lod, curl }); expect(t.dpr[1]).toBe(dprMax);
  });
});
