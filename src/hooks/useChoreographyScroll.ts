import { useEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * T12 / Capa 2: one scrubbed 0..1 progress for the whole Hero -> Problema
 * choreography, fed to the particle shader through `onProgress`
 * (useDisplayProgress.setProgress). Starts once the whole product stage is
 * on screen (Hero's bottom at the viewport bottom) and ends when Problema's
 * visual box is centered -- phase A (dissolve, 0..0.5) plays while the
 * Hero scrolls away, phase B (travel + re-form as the Nodo) lands where
 * the reader is looking. No pin.
 *
 * Lives in App (a passive useEffect) rather than inside Hero on purpose:
 * React attaches refs in tree order during the layout phase, so a layout
 * effect in Hero runs BEFORE Problema's `.visual` ref exists and the
 * trigger silently never got created. By the time App's passive effect
 * runs, every child's ref is attached.
 */
export function useChoreographyScroll(
  startRef: RefObject<HTMLElement | null>,
  endRef: RefObject<HTMLElement | null>,
  onProgress: (value: number) => void,
) {
  useEffect(() => {
    const start = startRef.current;
    const end = endRef.current;
    if (!start || !end) return;

    const trigger = ScrollTrigger.create({
      trigger: start,
      start: 'bottom bottom',
      endTrigger: end,
      end: 'center center',
      scrub: true,
      onUpdate: (self) => onProgress(self.progress),
    });
    if (import.meta.env.DEV) Object.assign(window, { __heroTrigger: trigger });

    return () => {
      trigger.kill();
      onProgress(0);
    };
  }, [startRef, endRef, onProgress]);
}
