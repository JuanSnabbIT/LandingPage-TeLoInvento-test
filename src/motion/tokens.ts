export const motion = {
  ease: { out: 'expo.out' },
  duration: { reveal: 0.5, crossfade: 0.2 },
  stagger: { grid: 0.07 },
  parallax: { maxYaw: 0.34, damping: 6 },
  // `pasos` = en cuántas etapas se recorre un tramo: la nube avanza y se
  // transforma un tercio, se queda quieta, y sigue. `meseta` = fracción del
  // tramo que dura cada pausa intermedia (hay `pasos - 1`). Con pasos: 1 el
  // tramo vuelve a ser un único movimiento continuo.
  // `pasos: 1` = una sola onda continua por tramo, como el sitio de referencia.
  // El escalonado en 3 etapas (pedido antes) sigue implementado en
  // `staircase()`: subir `pasos` a 3 lo devuelve sin tocar más nada.
  tramo: { reposoCola: 0.15, reposoCabeza: 0.15, pasos: 1, meseta: 0.17 },
  scrub: 0.4,
  /**
   * Cómo avanza un tramo de la nube.
   *
   * `disparo` (por defecto): el scroll DISPARA la transición y esta corre con su
   * propio tiempo, como el sitio de referencia -- que no ata la nube al scroll:
   * el scroll es un objetivo al que el sistema se acerca, no la línea de tiempo.
   * Es lo que hace que la transformación se lea como un movimiento y no como un
   * deslizador: si el visitante para de scrollear a mitad, la nube igual termina
   * de acomodarse.
   *
   * `scrub`: el comportamiento anterior, la nube exactamente donde dice el
   * scroll. Sigue disponible por si se quiere volver.
   */
  tramoModo: 'disparo' as 'disparo' | 'scrub',
  /** Duración de la transición disparada, y su curva. */
  tramoTween: { duration: 1.4, ease: 'none' },
  reveal: { distance: 22 },
} as const;
