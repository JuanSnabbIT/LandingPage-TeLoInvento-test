import { useEffect } from 'react';
import { registry } from '../scene/registry';
import { TRAMOS } from '../scene/cloud/sequence';
import { quantize } from '../scene/cloud/sequence';
import { createScrub } from './scrollTrigger';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isSceneDebug } from '../scene/debug';

function resolveEl(slot: string): Element | null {
  if (slot === 'hero') return document.querySelector('.hero');
  if (slot === 'contacto') return document.querySelector('#contacto');
  if (slot === 'hero-display') return document.querySelector('.hero__anchor');
  return registry.getSlot(slot)?.anchorRef.current ?? null;
}

export function useTramoScrubs(reduced: boolean) {
  useEffect(() => {
    const kills: Array<() => void> = [];
    const markers = isSceneDebug();
    const prev: number[] = [];
    TRAMOS.forEach((tr, i) => {
      const trigger = resolveEl(tr.trigger.start[0]);
      const endTrigger = resolveEl(tr.trigger.end[0]);
      if (!trigger || !endTrigger) {
        if (import.meta.env.DEV) console.warn('[motion] tramo sin ancla', i, tr.trigger);
        return;
      }
      kills.push(
        createScrub({
          trigger,
          start: tr.trigger.start[1],
          endTrigger,
          end: tr.trigger.end[1],
          markers,
          onUpdate: (p) => {
            const v = reduced ? (prev[i] = quantize(p, prev[i] ?? 0, 0.05)) : p;
            registry.setProgress(i, v);
          },
        }),
      );
    });
    const onOrient = () => ScrollTrigger.refresh();
    window.addEventListener('orientationchange', onOrient);
    return () => {
      kills.forEach((k) => k());
      window.removeEventListener('orientationchange', onOrient);
      TRAMOS.forEach((_, i) => registry.setProgress(i, 0));
    };
  }, [reduced]);
}
