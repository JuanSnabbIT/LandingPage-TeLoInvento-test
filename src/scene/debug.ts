import { registry } from './registry';
import { TRAMOS, resolveTramo, type Resolved } from './cloud/sequence';
import { motion } from '../motion/tokens';
import type { DeviceTier } from './deviceTier';

export interface SceneDebug {
  registry: typeof registry;
  resolve: () => Resolved;
  progress: () => number[];
  tier: DeviceTier;
}

/** `?debug` en la URL: activa markers de ScrollTrigger y `window.__scene`. */
export function isSceneDebug(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
}

/**
 * Expone `window.__scene` solo bajo `?debug` — es la sonda que usan las
 * capturas de QA para leer el progreso resuelto del tramo en el mismo frame
 * en que se saca el screenshot (sin ella no se distingue "en reposo" de
 * "a medio viaje", dado el scrub de 0.4 s).
 */
export function installSceneDebug(tier: DeviceTier, reduced: boolean): () => void {
  if (!isSceneDebug()) return () => {};
  const api: SceneDebug = {
    registry,
    resolve: () => resolveTramo((i) => registry.getProgress(i), TRAMOS, { ...motion.tramo, reduced }),
    progress: () => TRAMOS.map((_, i) => registry.getProgress(i)),
    tier,
  };
  (window as unknown as { __scene?: SceneDebug }).__scene = api;
  return () => { delete (window as unknown as { __scene?: SceneDebug }).__scene; };
}
