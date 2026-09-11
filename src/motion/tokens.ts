export const motion = {
  ease: { out: 'expo.out' },
  duration: { reveal: 0.5, crossfade: 0.2 },
  stagger: { grid: 0.07 },
  parallax: { maxYaw: 0.34, damping: 6 },
  tramo: { reposoCola: 0.2, reposoCabeza: 0.2 },
  scrub: 0.4,
  reveal: { distance: 22 },
} as const;
