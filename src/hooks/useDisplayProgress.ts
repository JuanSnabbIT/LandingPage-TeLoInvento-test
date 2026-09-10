import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useControls } from 'leva';

export interface DisplayProgressControls {
  progressRef: RefObject<number>;
  setProgress: (value: number) => void;
}

/**
 * Owns the shared `uProgress` value (0..1) that drives the logo particles'
 * local flat->exploded dispersal mix (see HeroCentralScene.tsx) -- NOT
 * scroll-linked travel to another section, that's future work, not built
 * yet. Currently driven by a single source: a leva debug slider (this
 * hook), which lets progress be scrubbed by hand for verification. A real
 * scroll trigger (e.g. GSAP ScrollTrigger once there's a real next
 * section to transition toward) is a later addition -- `setProgress` is
 * exposed so wiring one in later doesn't require touching this hook's
 * internals, just calling it from wherever that trigger lives.
 *
 * Deliberately does NOT import anything from @react-three/fiber here
 * (e.g. its global `invalidate()`) -- that would pull three.js/r3f into
 * this module's chunk, which App.tsx imports eagerly, undoing the
 * lazy-load split that keeps three.js off the critical path for first
 * paint (see HeroCentralCanvas.tsx). Instead, the canvas's frameloop is
 * just always "always" now, so a plain ref write here is picked up on the
 * next frame regardless -- no cross-module render-forcing needed.
 */
export function useDisplayProgress(): DisplayProgressControls {
  const progressRef = useRef(0);

  const setProgress = useCallback((value: number) => {
    progressRef.current = value;
  }, []);

  const { progress } = useControls('Display particles (harness debug)', {
    progress: { value: 0, min: 0, max: 1, step: 0.01, label: 'progress' },
  });

  useEffect(() => {
    setProgress(progress);
  }, [progress, setProgress]);

  return { progressRef, setProgress };
}
