import { describe, it, expect } from 'vitest';
import { anchorToWorldXY, viewportWorldHeight, PAGE_CAMERA_DISTANCE, PAGE_CAMERA_FOV_DEG } from './pageCameraMath';

describe('pageCameraMath', () => {
  it('centro del viewport → origen', () => {
    expect(anchorToWorldXY(0.5, 0.5, 1.6)).toEqual({ x: 0, y: 0 });
  });
  it('arriba-izquierda → (-halfW, +halfH)', () => {
    const h = viewportWorldHeight() / 2;
    const { x, y } = anchorToWorldXY(0, 0, 2);
    expect(y).toBeCloseTo(h); expect(x).toBeCloseTo(-h * 2);
  });
  it('altura del viewport coherente con fov/distancia', () => {
    expect(viewportWorldHeight()).toBeCloseTo(2 * PAGE_CAMERA_DISTANCE * Math.tan((PAGE_CAMERA_FOV_DEG * Math.PI) / 360));
  });
});
