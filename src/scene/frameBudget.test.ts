import { describe, it, expect } from 'vitest';
import { FrameBudget } from './frameBudget';

const feed = (fb: FrameBudget, fps: number, seconds: number) => {
  let last: string | null = null;
  for (let i = 0; i < fps * seconds; i++) last = fb.push(1 / fps) ?? last;
  return last;
};

describe('FrameBudget', () => {
  it('60 fps nunca degrada', () => {
    expect(feed(new FrameBudget(), 60, 10)).toBeNull();
  });

  it('5 fps degrada (antes se ignoraba por pocas muestras)', () => {
    expect(feed(new FrameBudget({ warmup: 0 }), 5, 4)).toBe('dpr1.5');
  });

  it('escalones en orden', () => {
    const fb = new FrameBudget({ warmup: 0 });
    const steps: string[] = [];
    for (let i = 0; i < 20 * 16; i++) {
      const s = fb.push(1 / 20);
      if (s) steps.push(s);
    }
    expect(steps).toEqual(['dpr1.5', 'dpr1', 'noCurl', 'reduced', 'poster']);
  });

  it('frames no contiguos no cuentan', () => {
    const fb = new FrameBudget({ warmup: 0 });
    let s: string | null = null;
    for (let i = 0; i < 100; i++) {
      s = fb.push(0.5) ?? s; // un frame cada 0.5 s (idle con gracia)
    }
    expect(s).toBeNull();
  });
});
