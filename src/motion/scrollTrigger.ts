import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from './tokens';

let ready = false;

/** Idempotente: registra el plugin y configura ScrollTrigger una sola vez. */
export function setupScrollTrigger(): void {
  if (ready) return;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  ready = true;
}

/**
 * Crea un scrub numérico enlazado a un tween (gsap.to) — nunca
 * ScrollTrigger.create + onUpdate, que reportaría el progreso crudo del
 * ScrollTrigger e ignoraría el suavizado del scrub numérico.
 */
export function createScrub(o: {
  trigger: Element;
  start: string;
  endTrigger: Element;
  end: string;
  scrub?: number;
  /** `?debug`: dibuja los markers de ScrollTrigger de este tramo. */
  markers?: boolean;
  onUpdate: (p: number) => void;
}): () => void {
  setupScrollTrigger();
  const state = { p: 0 };
  const tween = gsap.to(state, {
    p: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: o.trigger,
      start: o.start,
      endTrigger: o.endTrigger,
      end: o.end,
      scrub: o.scrub ?? motion.scrub,
      markers: o.markers ?? false,
    },
    onUpdate: () => o.onUpdate(state.p), // el tween avanza suavizado; state.p ES el progreso suavizado
  });
  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
  };
}
