import { describe, it, expect } from 'vitest';
import { TRAMOS, resolveTramo, quantize } from './sequence';

const opts = { reposoCola: 0.2, reposoCabeza: 0.2, reduced: false };
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
    const r = resolveTramo(P([0.5]), TRAMOS, opts); expect(r.b).toBe('nodo'); expect(r.t).toBeCloseTo(0.5, 5);
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
  it('los rangos de scroll de un tramo empiezan donde termina el anterior', () => {
    for (let i = 1; i < TRAMOS.length; i++) {
      expect({ i, t: TRAMOS[i].trigger.start }).toEqual({ i, t: TRAMOS[i - 1].trigger.end });
    }
  });
  it('morphEnSitio no cambia de slot y viaje sí', () => {
    for (const t of TRAMOS) {
      if (t.kind === 'morphEnSitio') expect(t.to!.slot).toBe(t.from.slot);
      if (t.kind === 'viaje') expect(t.to!.slot).not.toBe(t.from.slot);
    }
  });
});
describe('quantize', () => {
  it('histéresis', () => { expect(quantize(0.52, 0, 0.05)).toBe(0); expect(quantize(0.56, 0, 0.05)).toBe(1); expect(quantize(0.48, 1, 0.05)).toBe(1); expect(quantize(0.44, 1, 0.05)).toBe(0); });
});
