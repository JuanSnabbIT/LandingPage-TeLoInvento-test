import { describe, it, expect } from 'vitest';
import { TRAMOS, resolveTramo, quantize, staircase } from './sequence';

const opts = { reposoCola: 0.2, reposoCabeza: 0.2, pasos: 3, meseta: 0.17, reduced: false };
const unPaso = { ...opts, pasos: 1 };
const P = (vals: number[]) => (i: number) => vals[i] ?? 0;
/** Progresos que dejan el tramo `i` activo en `q`: todos los anteriores completos. */
const at = (i: number, q: number) => P([...Array(i).fill(1), q]);
const firstOfKind = (k: string) => TRAMOS.findIndex((t) => t.kind === k);

describe('resolveTramo', () => {
  it('todo en 0 → logo quieto en hero-display', () => {
    const r = resolveTramo(P([]), TRAMOS, opts);
    expect(r).toMatchObject({ a: 'logo', slotA: 'hero-display', t: 0, index: 0, alpha: 1 });
  });
  it('reposo de cola: q=0.1 → t=0', () => { expect(resolveTramo(P([0.1]), TRAMOS, opts).t).toBe(0); });
  it('mitad del viaje: q=0.5 → t≈0.5, b=nodo', () => {
    const r = resolveTramo(P([0.5]), TRAMOS, unPaso); expect(r.b).toBe('nodo'); expect(r.t).toBeCloseTo(0.5, 5);
  });
  it('con pasos=3 el viaje se queda quieto en los tercios', () => {
    // La meseta del medio cae dentro del tramo útil (entre los dos reposos):
    // q = 0.2 + 0.8 * 0.30 y q = 0.2 + 0.8 * 0.34 son dos puntos distintos del
    // scroll que tienen que dar exactamente el mismo t.
    const en = (u: number) => resolveTramo(P([opts.reposoCola + (1 - opts.reposoCola - opts.reposoCabeza) * u]), TRAMOS, opts).t;
    expect(en(0.30)).toBeCloseTo(1 / 3, 6);
    expect(en(0.34)).toBeCloseTo(1 / 3, 6);
    expect(en(0.70)).toBeCloseTo(2 / 3, 6);
    expect(en(0.5)).toBeGreaterThan(1 / 3);
    expect(en(0.5)).toBeLessThan(2 / 3);
  });
  it('reposo de cabeza: q=0.9 → t=1', () => { expect(resolveTramo(P([0.9]), TRAMOS, opts).t).toBe(1); });
  it('tramo 1 activo aunque tramo 0 = 1', () => {
    const r = resolveTramo(P([1, 0.5]), TRAMOS, opts); expect(r.index).toBe(1); expect(r.a).toBe('nodo'); expect(r.b).toBe('set');
  });
  it('morphEnSitio: sin reposo, mismo slot', () => {
    const r = resolveTramo(at(firstOfKind('morphEnSitio'), 0.5), TRAMOS, opts);
    expect(r.kind).toBe('morphEnSitio'); expect(r.slotA).toBe(r.slotB); expect(r.t).toBeCloseTo(0.5, 5);
  });
  it('apagado: alpha baja con t', () => {
    const r = resolveTramo(at(firstOfKind('apagado'), 0.5), TRAMOS, opts);
    expect(r.kind).toBe('apagado'); expect(r.alpha).toBeCloseTo(0.5, 5); expect(r.b).toBe('nodo');
  });
  it('reduced: cuantizado y crossfade', () => {
    const r = resolveTramo(P([0.7]), TRAMOS, { ...opts, reduced: true });
    expect(r.t === 0 || r.t === 1).toBe(true); expect(r.crossfade).toBe(true);
  });
});
describe('TRAMOS', () => {
  it('la cadena es continua: cada tramo arranca donde termina el anterior', () => {
    // Sin esto, insertar o renombrar un tramo (p. ej. meter `wifi` en Valor)
    // puede dejar un salto de forma o de slot que no falla en ningún test
    // unitario y sólo se ve como un parpadeo en la página.
    for (let i = 1; i < TRAMOS.length; i++) {
      const prev = TRAMOS[i - 1].to ?? TRAMOS[i - 1].from;
      expect({ i, ...TRAMOS[i].from }).toEqual({ i, ...prev });
    }
    expect(TRAMOS.at(-1)!.to).toBeNull();
    expect(TRAMOS.filter((t) => t.kind === 'apagado')).toHaveLength(1);
  });
  it('cada tramo se dispara sobre la caja de su destino', () => {
    // Con tramos disparados (no scrubbeados) el rango es una ventana sobre la
    // caja de DESTINO: es lo que hace que la nube llegue a la sección y se quede
    // mientras se la lee, en vez de empezar a irse al cruzar su centro.
    for (const t of TRAMOS) {
      if (!t.to) continue;
      expect({ k: t.kind, e: t.trigger.start[0] }).toEqual({ k: t.kind, e: t.to.slot });
      expect(t.trigger.end[0]).toBe(t.to.slot);
    }
    // El apagado es el único que se dispara sobre una sección sin slot.
    expect(TRAMOS.at(-1)!.trigger.start[0]).toBe('contacto');
  });
  it('morphEnSitio no cambia de slot y viaje sí', () => {
    for (const t of TRAMOS) {
      if (t.kind === 'morphEnSitio') expect(t.to!.slot).toBe(t.from.slot);
      if (t.kind === 'viaje') expect(t.to!.slot).not.toBe(t.from.slot);
    }
  });
});
describe('staircase', () => {
  it('empieza en 0, termina en 1 y nunca retrocede', () => {
    expect(staircase(0, 3, 0.17)).toBe(0);
    expect(staircase(1, 3, 0.17)).toBe(1);
    let prev = -1;
    for (let i = 0; i <= 200; i++) {
      const v = staircase(i / 200, 3, 0.17);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      prev = v;
    }
  });
  it('cada rampa avanza exactamente 1/pasos y las mesetas no avanzan', () => {
    const rampa = (1 - 2 * 0.17) / 3;
    expect(staircase(rampa, 3, 0.17)).toBeCloseTo(1 / 3, 6);
    expect(staircase(rampa + 0.17, 3, 0.17)).toBeCloseTo(1 / 3, 6);   // fin de la meseta
    expect(staircase(2 * (rampa + 0.17), 3, 0.17)).toBeCloseTo(2 / 3, 6);
  });
  it('pasos=1 es el suavizado continuo de siempre', () => {
    expect(staircase(0.5, 1, 0.17)).toBeCloseTo(0.5, 6);
    expect(staircase(0.25, 1, 0.17)).toBeCloseTo(0.15625, 6);
  });
});
describe('quantize', () => {
  it('histéresis', () => { expect(quantize(0.52, 0, 0.05)).toBe(0); expect(quantize(0.56, 0, 0.05)).toBe(1); expect(quantize(0.48, 1, 0.05)).toBe(1); expect(quantize(0.44, 1, 0.05)).toBe(0); });
});
