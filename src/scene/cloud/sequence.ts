import { getCapacidadesCard } from './capacidadesCarousel';

export type TramoKind = 'viaje' | 'morphEnSitio' | 'apagado';
export interface Tramo {
  from: { shape: string; slot: string };
  to: { shape: string; slot: string } | null;
  kind: TramoKind;
  trigger: { start: [string, string]; end: [string, string] };
  /**
   * Dirección en la que la ola cruza la forma durante el tramo (mundo, Y arriba).
   * El sitio de referencia ordena sus partículas por un eje distinto en cada
   * transición -- arriba→abajo, izq→der, der→izq -- y eso es lo que hace que la
   * transformación se lea como un barrido y no como una disolución.
   */
  sweep: [number, number, number];
  /**
   * 'manual': el progreso de este tramo NO sale de un ScrollTrigger
   * (`useTramoScrubs` lo salta) -- lo escribe otra cosa (el carrusel de
   * Capacidades, vía `capacidadesCarousel.ts`) llamando a
   * `registry.setProgress` directamente. Ausente = scrub por scroll, como
   * todos los demás.
   */
  driver?: 'manual';
  /**
   * Forma de origen calculada en el momento en vez de leída de `from.shape`.
   * La usa el tramo que sale de Capacidades hacia Valor: cuál de las tres
   * tarjetas (riego/seguridad/hogar) estaba activa en el carrusel decide de
   * cuál arranca el viaje, así no hay un salto de forma si el visitante
   * scrollea habiendo dejado otra tarjeta activa. `from.shape` sigue declarado como
   * el default documentado (el estado inicial del carrusel, antes de que el
   * visitante interactúe).
   */
  dynamicFrom?: () => string;
  /**
   * Sólo tiene efecto en `morphEnSitio`. Por default ese `kind` fuerza
   * `uRigid: 1` (§5.2 de la doc): sin desfase por partícula (`uStagger`), un
   * mix directo A↔B — correcto para piezas que vuelven a su lugar
   * (`nodo-explotado` → `nodo`) o para el apagado, donde cada partícula debe
   * moverse en lockstep. Pero entre formas SIN relación física (riego,
   * seguridad, hogar: el índice i no es "la misma pieza" en las dos) un mix
   * directo se ve como una doble exposición borrosa -- las dos nubes
   * promediadas a la vez, con huecos donde sus densidades no coinciden -- en
   * vez de una transformación. `stagger: true` prende el mismo barrido
   * dirigido (`uSweepDir`/`uStagger`) que usan los tramos `viaje`, así la
   * forma se lee como una ola que cruza el modelo también en el carrusel de
   * Capacidades. El curl y el swirl (turbulencia de vuelo) siguen apagados:
   * es "barrido en el sitio", no un viaje por el aire.
   */
  stagger?: boolean;
}
/** Travel occupies the arrival window; the model rests while its section is read. */
export const TRAMOS: Tramo[] = [
  { from: { shape: 'logo', slot: 'hero-display' }, to: { shape: 'nodo', slot: 'problema' }, kind: 'viaje', trigger: { start: ['problema', 'top 100%'], end: ['problema', 'top 30%'] }, sweep: [0, -1, 0] },
  { from: { shape: 'nodo', slot: 'problema' }, to: { shape: 'set', slot: 'solucion' }, kind: 'viaje', trigger: { start: ['solucion', 'top 100%'], end: ['solucion', 'top 30%'] }, sweep: [1, 0, 0] },
  { from: { shape: 'set', slot: 'solucion' }, to: { shape: 'riego', slot: 'capacidades' }, kind: 'viaje', trigger: { start: ['capacidades', 'top 100%'], end: ['capacidades', 'top 30%'] }, sweep: [-1, 0, 0] },
  // Carrusel de Capacidades: riego -> seguridad -> hogar. Su progreso no lo scrubbea useTramoScrubs: en desktop lo escribe el scroll horizontal fijado de Capacidades.tsx, en teléfono el click (capacidadesCarousel.ts). El `trigger` es inerte; apunta a la caja para cumplir la invariante trigger == to.slot.
  { from: { shape: 'riego', slot: 'capacidades' }, to: { shape: 'seguridad', slot: 'capacidades' }, kind: 'morphEnSitio', trigger: { start: ['capacidades', 'top 95%'], end: ['capacidades', 'top 48%'] }, sweep: [1, 0, 0], driver: 'manual', stagger: true },
  { from: { shape: 'seguridad', slot: 'capacidades' }, to: { shape: 'hogar', slot: 'capacidades' }, kind: 'morphEnSitio', trigger: { start: ['capacidades', 'top 95%'], end: ['capacidades', 'top 48%'] }, sweep: [-1, 0, 0], driver: 'manual', stagger: true },
  // Salida de Capacidades: arranca de la tarjeta activa (`dynamicFrom`); `from.shape` es el default (carrusel sin tocar).
  { from: { shape: 'riego', slot: 'capacidades' }, to: { shape: 'wifi', slot: 'valor' }, kind: 'viaje', trigger: { start: ['valor', 'top 100%'], end: ['valor', 'top 30%'] }, sweep: [1, 0, 0], dynamicFrom: getCapacidadesCard },
  { from: { shape: 'wifi', slot: 'valor' }, to: { shape: 'nodo-explotado', slot: 'proceso' }, kind: 'viaje', trigger: { start: ['proceso', 'top 105%'], end: ['proceso', 'top 60%'] }, sweep: [0, -1, 0] },
  { from: { shape: 'nodo-explotado', slot: 'proceso' }, to: { shape: 'nodo', slot: 'proceso' }, kind: 'morphEnSitio', trigger: { start: ['proceso', 'top 50%'], end: ['proceso', 'top 5%'] }, sweep: [0, 1, 0] },
  { from: { shape: 'nodo', slot: 'proceso' }, to: { shape: 'microchip', slot: 'contacto-microchip' }, kind: 'viaje', trigger: { start: ['contacto-microchip', 'top 100%'], end: ['contacto-microchip', 'top 45%'] }, sweep: [1, 0, 0] },
  // Apagado sobre la MISMA caja que la llegada, más abajo: el chip descansa entero mientras su caja va del 55% al 32% del viewport y se apaga al meterse bajo el header. Sobre la sección entera (#contacto) se apagaba antes de que el visitante lo viera.
  { from: { shape: 'microchip', slot: 'contacto-microchip' }, to: null, kind: 'apagado', trigger: { start: ['contacto-microchip', 'top 32%'], end: ['contacto-microchip', 'top 4%'] }, sweep: [0, -1, 0] },
];
/** Posiciones en `TRAMOS` de los tramos manuales del carrusel de Capacidades, en orden (riego→seguridad, seguridad→hogar) -- capacidadesCarousel.ts escribe su progreso. */
export const CAROUSEL_TRAMOS: readonly number[] = TRAMOS.flatMap((t, i) => (t.driver === 'manual' ? [i] : []));
export interface Resolved { a: string; b: string; slotA: string; slotB: string; t: number; alpha: number; kind: TramoKind; index: number; crossfade: boolean }
const smooth = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };

/**
 * Escalera: recorre [0,1] en `pasos` rampas suavizadas separadas por mesetas,
 * en vez de un único movimiento continuo. Cada rampa avanza exactamente
 * `1/pasos` y cada meseta ocupa `meseta` del recorrido, así que la forma se
 * transforma de a tercios y entre medio queda quieta el tiempo suficiente para
 * verla.
 *
 * Es una función del progreso, no una animación con estado: sigue valiendo que
 * la escena entera sea función pura del scroll, y scrollear hacia atrás
 * deshace las etapas en el mismo orden.
 *
 * `pasos <= 1` devuelve el suavizado de siempre.
 */
export function staircase(x: number, pasos: number, meseta: number): number {
  if (pasos <= 1) return smooth(x);
  const c = Math.min(1, Math.max(0, x));
  const rampa = (1 - (pasos - 1) * meseta) / pasos;
  const unidad = rampa + meseta;
  const i = Math.min(pasos - 1, Math.floor(c / unidad));
  const local = (c - i * unidad) / rampa;   // > 1 mientras dura la meseta
  return (i + smooth(Math.min(1, local))) / pasos;
}
export function quantize(p: number, prev: number, h: number): number { return prev < 0.5 ? (p > 0.5 + h ? 1 : 0) : (p < 0.5 - h ? 0 : 1); }
export function resolveTramo(progress: (i: number) => number, tramos: Tramo[], o: { reposoCola: number; reposoCabeza: number; pasos: number; meseta: number; reduced: boolean }): Resolved {
  let index = 0; for (let i = tramos.length - 1; i >= 0; i--) { if (progress(i) > 0) { index = i; break; } }
  const tr = tramos[index]; const q = Math.min(1, Math.max(0, progress(index)));
  const a = tr.dynamicFrom ? tr.dynamicFrom() : tr.from.shape, slotA = tr.from.slot, b = tr.to?.shape ?? a, slotB = tr.to?.slot ?? tr.from.slot;
  let t: number; let alpha = 1;
  if (o.reduced) { t = q >= 0.5 ? 1 : 0; }
  else if (tr.kind === 'viaje') {
    const span = 1 - o.reposoCola - o.reposoCabeza;
    t = q <= o.reposoCola ? 0 : q >= 1 - o.reposoCabeza ? 1 : staircase((q - o.reposoCola) / span, o.pasos, o.meseta);
  } else if (tr.kind === 'morphEnSitio') { t = staircase(q, o.pasos, o.meseta); }
  else { t = smooth(q); }
  if (tr.kind === 'apagado') alpha = 1 - t;
  return { a, b, slotA, slotB, t, alpha, kind: tr.kind, index, crossfade: o.reduced };
}
