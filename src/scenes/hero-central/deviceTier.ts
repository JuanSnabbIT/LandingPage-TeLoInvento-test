export type DeviceTierName = 'high' | 'medium' | 'low';

export interface DeviceTierConfig {
  tier: DeviceTierName;
  /** Upper bound on particles drawn for the logo point cloud. */
  maxParticles: number;
  /** [min, max] devicePixelRatio passed straight to <Canvas dpr>. */
  dpr: [number, number];
}

/**
 * Device-tier heuristic per docs/architecture/3d-web-standard.md §7:
 * viewport width + navigator.hardwareConcurrency only -- never WebGL
 * renderer-string sniffing.
 *
 * The logo asset (logo-lod1.glb) has ~32k vertices total; the particle
 * pipeline decision locked for this spike (variant A, direct runtime read)
 * is validated up to ~15-20k particles, so even the "high" tier caps below
 * that ceiling rather than using every vertex. These numbers are a starting
 * point -- §5 of the standard explicitly calls for adjusting with real
 * device measurements, which is out of scope for this spike.
 */
export function getDeviceTier(): DeviceTierConfig {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { tier: 'low', maxParticles: 4000, dpr: [1, 1] };
  }

  const width = window.innerWidth;
  const cores = navigator.hardwareConcurrency ?? 4;

  if (width >= 1024 && cores >= 8) {
    return { tier: 'high', maxParticles: 16000, dpr: [1, 2] };
  }

  if (width >= 768 && cores >= 4) {
    return { tier: 'medium', maxParticles: 9000, dpr: [1, 1.5] };
  }

  return { tier: 'low', maxParticles: 4000, dpr: [1, 1] };
}
