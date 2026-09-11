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
  // Los reposos existen para el modo 'scrub': dan descanso dentro del rango de
  // scroll. Bajo 'disparo' el progreso ya viene de un tween con su propio tiempo,
  // y un reposo del 15 % son 0.21 s congelados en cada punta de una animación de
  // 1.45 s que el visitante está mirando. Si se vuelve a 'scrub', restaurar 0.15.
  tramo: { reposoCola: 0, reposoCabeza: 0, pasos: 1, meseta: 0.17 },
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
  // La respuesta compuesta del sitio de referencia (su scroll suavizado 0.075 ->
  // lerp de uniforms 0.1 -> resorte en GPU 0.006/0.892) llega al 50 % a 0.455 T y
  // al 90 % a 0.769 T. `power2.inOut` acierta el 90 % exacto y va 9 puntos lento
  // en el medio: es la mejor aproximación entre las curvas estándar. `none` daba
  // 50 % a la mitad del tiempo, que es lo único que ninguna respuesta física hace.
  tramoTween: { duration: 1.45, ease: 'power2.inOut' },
  reveal: { distance: 22 },
} as const;
