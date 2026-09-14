export const motion = {
  ease: { out: 'expo.out' },
  duration: { reveal: 0.5, crossfade: 0.2 },
  stagger: { grid: 0.07 },
  parallax: { maxYaw: 0.34, damping: 6 },
  // Scroll position is the timeline: stopping the wheel preserves the morph.
  tramo: { reposoCola: 0, reposoCabeza: 0, pasos: 1, meseta: 0 },
  scrub: true,
  tramoModo: 'scrub' as 'disparo' | 'scrub',
  tramoTween: { duration: 1.45, ease: 'none' }, // legacy trigger helper only
  reveal: { distance: 22 },
} as const;
