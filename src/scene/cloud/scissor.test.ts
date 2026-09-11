import { describe, it, expect } from 'vitest';
import { unionRect, corridorRect } from './scissor';
const r = (l: number, t: number, w: number, h: number) => ({ left: l, top: t, width: w, height: h, right: l + w, bottom: t + h }) as DOMRectReadOnly;
describe('unionRect', () => {
  it('une dos cajas con margen y convierte a origen inferior', () => {
    const u = unionRect(r(100, 100, 200, 100), r(500, 400, 100, 100), 0, { width: 1000, height: 800 })!;
    expect(u).toEqual({ x: 100, y: 800 - 500, w: 500, h: 400 });
  });
  it('null si no hay cajas', () => { expect(unionRect(null, null, 0.2, { width: 10, height: 10 })).toBeNull(); });
  it('recorta al viewport', () => { const u = unionRect(r(-50, -50, 100, 100), null, 0, { width: 200, height: 200 })!; expect(u.x).toBe(0); expect(u.w).toBe(50); });
});

describe('corridorRect', () => {
  const stagger = 0.35;
  const viewport = { width: 4000, height: 1000 };
  const aFar = r(0, 0, 100, 100);
  const bFar = r(3000, 0, 100, 100);

  it('en t=0 es la caja A (con margen), igual que unionRect de una sola caja', () => {
    const c = corridorRect(aFar, bFar, 0, stagger, 0.2, viewport);
    expect(c).toEqual(unionRect(aFar, null, 0.2, viewport));
  });

  it('en t=1 es la caja B (con margen), igual que unionRect de una sola caja', () => {
    const c = corridorRect(aFar, bFar, 1, stagger, 0.2, viewport);
    expect(c).toEqual(unionRect(bFar, null, 0.2, viewport));
  });

  it('a mitad de camino sigue al enjambre: el corredor queda estrictamente entre A y B, no cubre todo el hueco', () => {
    const c = corridorRect(aFar, bFar, 0.5, stagger, 0, viewport)!;
    expect(c.x).toBeGreaterThan(aFar.left);
    expect(c.x + c.w).toBeLessThan(bFar.right);
    expect(c.w).toBeLessThan(bFar.right - aFar.left);
  });

  it('con una sola caja disponible se comporta como unionRect', () => {
    expect(corridorRect(aFar, null, 0.5, stagger, 0.2, viewport)).toEqual(unionRect(aFar, null, 0.2, viewport));
    expect(corridorRect(null, bFar, 0.5, stagger, 0.2, viewport)).toEqual(unionRect(null, bFar, 0.2, viewport));
  });
});
