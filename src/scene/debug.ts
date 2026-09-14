import { registry } from './registry';
import { TRAMOS, resolveTramo, type Resolved } from './cloud/sequence';
import { motion } from '../motion/tokens';
import type { DeviceTier } from './deviceTier';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export interface SceneDebug {
  registry: typeof registry;
  resolve: () => Resolved;
  progress: () => number[];
  tier: DeviceTier;
  ranges: () => Array<{ id: string; start: number; end: number }>;
}

/** `?debug` en la URL: activa markers de ScrollTrigger y `window.__scene`. */
export function isSceneDebug(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
}

/** Debug exposes resolved state and measured travel ranges for visual QA. */
export function installSceneDebug(tier: DeviceTier, reduced: boolean): () => void {
  if (!isSceneDebug()) return () => {};
  const api: SceneDebug = {
    registry,
    resolve: () => resolveTramo((i) => registry.getProgress(i), TRAMOS, { ...motion.tramo, reduced }),
    progress: () => TRAMOS.map((_, i) => registry.getProgress(i)),
    tier,
    ranges: () => ScrollTrigger.getAll().filter(st => st.vars.id?.startsWith('cloud-')).map(st => ({ id: st.vars.id!, start: st.start, end: st.end })),
  };
  (window as unknown as { __scene?: SceneDebug }).__scene = api;
  return () => { delete (window as unknown as { __scene?: SceneDebug }).__scene; };
}
