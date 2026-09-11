export const motion = {
  ease: { out: 'expo.out' },
  duration: { reveal: 0.5, crossfade: 0.2 },
  stagger: { grid: 0.07 },
  parallax: { maxYaw: 0.34, damping: 6 },
  // `pasos` = en cuántas etapas se recorre un tramo: la nube avanza y se
  // transforma un tercio, se queda quieta, y sigue. `meseta` = fracción del
  // tramo que dura cada pausa intermedia (hay `pasos - 1`). Con pasos: 1 el
  // tramo vuelve a ser un único movimiento continuo.
  tramo: { reposoCola: 0.2, reposoCabeza: 0.2, pasos: 3, meseta: 0.17 },
  scrub: 0.4,
  reveal: { distance: 22 },
} as const;
