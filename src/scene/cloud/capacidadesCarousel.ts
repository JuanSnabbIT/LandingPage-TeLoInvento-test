import { gsap } from 'gsap';
import { registry } from '../registry';

/**
 * Las dos tarjetas del carrusel de Capacidades, en el mismo orden que el
 * tramo `morphEnSitio` de `sequence.ts` (from=riego, to=seguridad). El
 * índice acá ES el valor de progreso 0/1 de ese tramo.
 */
export const CAPACIDADES_CARDS = ['riego', 'seguridad'] as const;
export type CapacidadCard = (typeof CAPACIDADES_CARDS)[number];

let current = 0;

/** Forma que dejó activa el carrusel -- lo lee `dynamicFrom` del tramo de salida hacia Hogar, para que ese viaje arranque de la tarjeta que se estaba viendo. */
export function getCapacidadesCard(): CapacidadCard {
  return CAPACIDADES_CARDS[current];
}

const state = { t: 0 };
let tween: gsap.core.Tween | null = null;

/**
 * Mueve la nube entre las dos tarjetas de Capacidades animando el progreso
 * del tramo `morphEnSitio` riego<->seguridad (no del scroll -- el click es
 * el driver acá). `tramoIndex` es la posición de ese tramo en `TRAMOS`.
 */
export function driveCapacidadesCarousel(index: number, tramoIndex: number, reduced: boolean) {
  current = Math.max(0, Math.min(CAPACIDADES_CARDS.length - 1, index));
  const target = current;
  tween?.kill();
  if (reduced) {
    state.t = target;
    registry.setProgress(tramoIndex, target);
    return;
  }
  tween = gsap.to(state, {
    t: target,
    duration: 0.6,
    ease: 'power2.inOut',
    onUpdate: () => registry.setProgress(tramoIndex, state.t),
  });
}
