import { describe, it, expect } from 'vitest';
import { computeAnchorTransform } from './anchoring';
import { viewportWorldHeight } from './pageCameraMath';

const size = { width: 1000, height: 500 };
const rect = (left: number, top: number, w: number, h: number) => ({ left, top, width: w, height: h, right: left + w, bottom: top + h, x: left, y: top, toJSON() {} }) as DOMRectReadOnly;

describe('computeAnchorTransform', () => {
  it('caja centrada → origen, visible', () => {
    const t = computeAnchorTransform(rect(400, 200, 200, 100), size, { fit: 0.5, maxDim: 2 });
    expect(t.x).toBeCloseTo(0); expect(t.y).toBeCloseTo(0); expect(t.visible).toBe(true);
  });
  it('escala por el lado MENOR de la caja', () => {
    const worldPerPx = viewportWorldHeight() / size.height;
    const t = computeAnchorTransform(rect(0, 0, 300, 100), size, { fit: 0.5, maxDim: 2 });
    expect(t.scale).toBeCloseTo((0.5 * 100 * worldPerPx) / 2);
  });
  it('caja muy por debajo del viewport → invisible', () => {
    expect(computeAnchorTransform(rect(0, 2000, 100, 100), size, { fit: 1, maxDim: 1 }).visible).toBe(false);
  });
  it('usa el tamaño del renderer, no window', () => {
    const a = computeAnchorTransform(rect(0, 0, 100, 100), { width: 1000, height: 500 }, { fit: 1, maxDim: 1 });
    const b = computeAnchorTransform(rect(0, 0, 100, 100), { width: 2000, height: 500 }, { fit: 1, maxDim: 1 });
    expect(a.x).not.toBeCloseTo(b.x);
  });
});
