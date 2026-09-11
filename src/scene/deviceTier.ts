export type Tier = 'high' | 'medium' | 'low';
export type Lod = 'lod2' | 'mobile';
export interface DeviceTier { tier: Tier; lod: Lod; dpr: [number, number]; curl: boolean; }
export function getDeviceTier(env?: { width: number; cores: number }): DeviceTier {
  const width = env?.width ?? (typeof window !== 'undefined' ? window.innerWidth : 0);
  const cores = env?.cores ?? (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency ?? 4 : 4);
  if (width >= 1024 && cores >= 8) return { tier: 'high', lod: 'lod2', dpr: [1, 2], curl: true };
  if (width >= 768 && cores >= 4) return { tier: 'medium', lod: 'lod2', dpr: [1, 1.5], curl: true };
  return { tier: 'low', lod: 'mobile', dpr: [1, 1], curl: false };
}
