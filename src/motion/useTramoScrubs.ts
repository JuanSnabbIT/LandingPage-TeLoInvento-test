import { useEffect } from 'react';
import { registry } from '../scene/registry';
import { TRAMOS } from '../scene/cloud/sequence';
import { quantize } from '../scene/cloud/sequence';
import { createScrub, createTriggerTween } from './scrollTrigger';
import { motion } from './tokens';
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
      const onUpdate = (p: number) => {
        const v = reduced ? (prev[i] = quantize(p, prev[i] ?? 0, 0.05)) : p;
        registry.setProgress(i, v);
      };
      if (motion.tramoModo === 'scrub') {
        kills.push(createScrub({ id: `cloud-${i}`, trigger, start: tr.trigger.start[1], endTrigger, end: tr.trigger.end[1], markers, onUpdate }));
        return;
      }
      kills.push(
        createTriggerTween({
          trigger,
          start: tr.trigger.start[1],
          endTrigger,
          end: tr.trigger.end[1],
          markers,
          // Con reduced motion la transición no se anima: salta.
          duration: reduced ? 0 : motion.tramoTween.duration,
          onUpdate,
          // La cadena tiene que quedar coherente al arrancar: `resolveTramo`
          // elige el ÚLTIMO tramo con progreso > 0, así que un tramo anterior a
          // medio camino se perdería de vista a mitad de morph. Al entrar a uno,
          // los de atrás se dan por completos y los de adelante por no empezados.
          onSnap: (dir) => {
            TRAMOS.forEach((_, j) => {
              if (j < i) registry.setProgress(j, 1);
              else if (j > i) registry.setProgress(j, 0);
            });
            if (dir === -1) registry.setProgress(i, registry.getProgress(i));
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
