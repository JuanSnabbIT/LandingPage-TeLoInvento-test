import { gsap } from 'gsap';
import { registry } from '../registry';

/**
 * Las tarjetas del carrusel de Capacidades, en el mismo orden que los tramos
 * `driver: 'manual'` de `sequence.ts`: el tramo manual k morfea la tarjeta k
 * en la k+1, así que "tarjeta activa = i" equivale a progreso 1 en los tramos
 * manuales k < i y 0 en los demás.
 */
export const CAPACIDADES_CARDS = ['riego', 'seguridad', 'hogar'] as const;
export type CapacidadCard = (typeof CAPACIDADES_CARDS)[number];

let current = 0;

/** Forma que dejó activa el carrusel -- lo lee `dynamicFrom` del tramo que sale de Capacidades, para que ese viaje arranque de la tarjeta que se estaba viendo. */
export function getCapacidadesCard(): CapacidadCard {
  return CAPACIDADES_CARDS[current];
}

const steps = CAPACIDADES_CARDS.slice(1).map(() => ({ t: 0 }));
let timeline: gsap.core.Timeline | null = null;

/**
 * Mueve la nube a la tarjeta `index` animando, en orden, el progreso de los
 * tramos manuales que separan la tarjeta actual de la pedida (no del scroll:
 * el click es el driver acá). Saltar dos tarjetas pasa por la del medio, así
 * el morph siempre es entre formas vecinas. `tramoIndices` son las
 * posiciones de esos tramos en `TRAMOS`, en orden.
 */
export function driveCapacidadesCarousel(index: number, tramoIndices: readonly number[], reduced: boolean) {
  current = Math.max(0, Math.min(CAPACIDADES_CARDS.length - 1, index));
  const goal = (k: number) => (current > k ? 1 : 0);
  const apply = (k: number) => registry.setProgress(tramoIndices[k], steps[k].t);
  timeline?.kill();
  if (reduced) {
    steps.forEach((s, k) => { s.t = goal(k); apply(k); });
    return;
  }
  // Hacia adelante se completan primero los tramos de abajo; hacia atrás, al
  // revés. Incluye los que quedaron a medias si se interrumpió un click anterior.
  const order = steps.map((_, k) => k).filter((k) => steps[k].t !== goal(k));
  if (order.length && goal(order[0]) === 0) order.reverse();
  timeline = gsap.timeline();
  for (const k of order) {
    timeline.to(steps[k], {
      t: goal(k),
      duration: 0.6 * Math.abs(goal(k) - steps[k].t),
      ease: 'power2.inOut',
      onUpdate: () => apply(k),
    });
  }
}
