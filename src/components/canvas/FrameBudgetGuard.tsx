import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

interface FrameBudgetGuardProps {
  /** Called once when the scene has sustained a frame rate below `minFps`. */
  onDegrade: () => void;
  /** Frame-rate floor. Default 24. */
  minFps?: number;
  /** Consecutive 1-second windows below the floor before degrading. Default 3. */
  strikes?: number;
  /** Seconds to ignore after mount (shader compile, first uploads). Default 2. */
  warmupSeconds?: number;
}

/**
 * T16: runtime performance gate for the persistent canvas. Measures real
 * frame times in 1-second windows after a warm-up; if `strikes` windows in
 * a row fall under `minFps`, it asks the host to degrade (static poster
 * instead of 3D). This is the "degrade to no-3D on weak mobile" fallback
 * called for in the vault (07-arquitectura-tecnica-motion.md §3), decided
 * from measurement on the actual device rather than UA sniffing.
 *
 * Windows with too few frames are ignored: a background/occluded tab is
 * throttled to ~1 rAF per second by the browser, which is not a slow GPU.
 */
export function FrameBudgetGuard({ onDegrade, minFps = 24, strikes = 3, warmupSeconds = 2 }: FrameBudgetGuardProps) {
  const state = useRef({ elapsed: 0, windowTime: 0, frames: 0, bad: 0, done: false });

  useFrame((_, delta) => {
    const s = state.current;
    if (s.done) return;
    // Throttled tab / debugger pause: a single huge delta says nothing
    // about rendering cost -- drop it.
    if (delta > 0.5) return;

    s.elapsed += delta;
    if (s.elapsed < warmupSeconds) return;

    s.windowTime += delta;
    s.frames += 1;
    if (s.windowTime < 1) return;

    const fps = s.frames / s.windowTime;
    const enoughSamples = s.frames >= 8;
    s.windowTime = 0;
    s.frames = 0;
    if (!enoughSamples) return;

    s.bad = fps < minFps ? s.bad + 1 : 0;
    if (s.bad >= strikes) {
      s.done = true;
      onDegrade();
    }
  });

  return null;
}
