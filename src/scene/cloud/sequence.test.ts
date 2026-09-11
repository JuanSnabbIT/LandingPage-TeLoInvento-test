import { describe, it, expect } from 'vitest';
import { TRAMOS, resolveTramo, quantize } from './sequence';

const opts = { reposoCola: 0.2, reposoCabeza: 0.2, reduced: false };
const P = (vals: number[]) => (i: number) => vals[i] ?? 0;

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
    const r = resolveTramo(P([1, 1, 1, 1, 1, 0.5]), TRAMOS, opts);
    expect(r.kind).toBe('morphEnSitio'); expect(r.slotA).toBe(r.slotB); expect(r.t).toBeCloseTo(0.5, 5);
  });
  it('apagado: alpha baja con t', () => {
    const r = resolveTramo(P([1, 1, 1, 1, 1, 1, 0.5]), TRAMOS, opts);
    expect(r.kind).toBe('apagado'); expect(r.alpha).toBeCloseTo(0.5, 5); expect(r.b).toBe('nodo');
  });
  it('reduced: cuantizado y crossfade', () => {
    const r = resolveTramo(P([0.7]), TRAMOS, { ...opts, reduced: true });
    expect(r.t === 0 || r.t === 1).toBe(true); expect(r.crossfade).toBe(true);
  });
});
describe('quantize', () => {
  it('histéresis', () => { expect(quantize(0.52, 0, 0.05)).toBe(0); expect(quantize(0.56, 0, 0.05)).toBe(1); expect(quantize(0.48, 1, 0.05)).toBe(1); expect(quantize(0.44, 1, 0.05)).toBe(0); });
});
