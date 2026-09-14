export const motion = {
  ease: { out: 'expo.out' },
  duration: { reveal: 0.5, crossfade: 0.2 },
  stagger: { grid: 0.07 },
  // Parallax con el puntero en TODOS los modelos: giro máximo (rad) de yaw -- el pitch es la mitad -- y amortiguación.
  // Un slot puede pisarlo con su propio `parallax` (0 lo apaga).
  parallax: { amount: 0.22, damping: 6 },
  // Scroll position is the timeline: stopping the wheel preserves the morph.
  tramo: { reposoCola: 0, reposoCabeza: 0, pasos: 1, meseta: 0 },
  scrub: true,
  tramoModo: 'scrub' as 'disparo' | 'scrub',
  tramoTween: { duration: 1.45, ease: 'none' }, // legacy trigger helper only
  reveal: { distance: 22 },
  // Scroll horizontal fijado de Capacidades (desktop): alto de viewport de scroll por cada paso de
  // tarjeta, y pausa con la tarjeta quieta antes/después de cada paso (en unidades del paso, 1 = lo que dura el deslizamiento).
  capacidades: { scrollPerCard: 1.1, hold: 0.45 },
} as const;
