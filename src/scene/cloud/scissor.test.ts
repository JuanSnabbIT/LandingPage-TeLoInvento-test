import { describe, it, expect } from 'vitest';
import { unionRect } from './scissor';
const r = (l: number, t: number, w: number, h: number) => ({ left: l, top: t, width: w, height: h, right: l + w, bottom: t + h }) as DOMRectReadOnly;
describe('unionRect', () => {
  it('une dos cajas con margen y convierte a origen inferior', () => {
    const u = unionRect(r(100, 100, 200, 100), r(500, 400, 100, 100), 0, { width: 1000, height: 800 })!;
    expect(u).toEqual({ x: 100, y: 800 - 500, w: 500, h: 400 });
  });
  it('null si no hay cajas', () => { expect(unionRect(null, null, 0.2, { width: 10, height: 10 })).toBeNull(); });
  it('recorta al viewport', () => { const u = unionRect(r(-50, -50, 100, 100), null, 0, { width: 200, height: 200 })!; expect(u.x).toBe(0); expect(u.w).toBe(50); });
});
