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
 * Crea un tramo DISPARADO: el ScrollTrigger no scrubbea nada, sólo avisa cuándo
 * se cruza su rango, y la transición corre como un tween con su propia duración.
 *
 * Es el modelo del sitio de referencia (ver `motion.tramoModo`). Cada cruce
 * manda el progreso a 0 o a 1 y el tween se encarga del camino; `onSnap` avisa
 * para que el llamador mantenga coherente la cadena de tramos (los anteriores
 * completos, los posteriores en cero), porque con tweens el visitante puede
 * cruzar dos rangos antes de que termine el primero.
 */
export function createTriggerTween(o: {
  trigger: Element;
  start: string;
  endTrigger: Element;
  end: string;
  duration?: number;
  ease?: string;
  markers?: boolean;
  onUpdate: (p: number) => void;
  /** `dir` = 1 avanzando, -1 retrocediendo. Se llama ANTES de arrancar el tween. */
  onSnap?: (dir: 1 | -1) => void;
}): () => void {
  setupScrollTrigger();
  const state = { p: 0 };
  const dur = o.duration ?? motion.tramoTween.duration;
  const ease = o.ease ?? motion.tramoTween.ease;
  let tween: gsap.core.Tween | null = null;
  const go = (to: number, dir: 1 | -1) => {
    o.onSnap?.(dir);
    tween?.kill();
    if (dur <= 0) { state.p = to; o.onUpdate(to); return; }
    tween = gsap.to(state, { p: to, duration: dur, ease, onUpdate: () => o.onUpdate(state.p) });
  };
  const st = ScrollTrigger.create({
    trigger: o.trigger,
    start: o.start,
    endTrigger: o.endTrigger,
    end: o.end,
    markers: o.markers ?? false,
    onEnter: () => go(1, 1),
    onEnterBack: () => go(0, -1),
    // Cruzar el rango entero de un saque (scroll rápido, salto por ancla) tiene
    // que dejar el tramo en su extremo igual: si no, queda a medio camino para
    // siempre porque ya no habrá más eventos de este trigger.
    onLeave: () => { tween?.kill(); state.p = 1; o.onUpdate(1); },
    onLeaveBack: () => { tween?.kill(); state.p = 0; o.onUpdate(0); },
  });
  return () => { tween?.kill(); st.kill(); };
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
  scrub?: boolean | number;
  id?: string;
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
      id: o.id,
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
