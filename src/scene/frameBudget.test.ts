import { describe, it, expect } from 'vitest';
import { FrameBudget } from './frameBudget';

/** Dibuja `seconds` de reloj a `fps`, con el costo de cada frame = 1/fps (saturado). */
const feed = (fb: FrameBudget, fps: number, seconds: number) => {
  let last: string | null = null;
  for (let i = 0; i < fps * seconds; i++) last = fb.push(1 / fps, 1 / fps) ?? last;
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
      const s = fb.push(1 / 20, 1 / 20);
      if (s) steps.push(s);
    }
    expect(steps).toEqual(['dpr1.5', 'dpr1', 'noCurl', 'reduced', 'poster']);
  });

  it('dibujar de a ratos, barato, NO degrada', () => {
    // La escena sólo dibuja cuando algo cambia: un frame de 4 ms cada medio
    // segundo es reposo, no lentitud. Midiendo el hueco entre frames (como
    // antes) esto parecía 2 fps; midiendo el costo, son 250.
    const fb = new FrameBudget({ warmup: 0 });
    let s: string | null = null;
    for (let i = 0; i < 100; i++) s = fb.push(0.004, 0.5) ?? s;
    expect(s).toBeNull();
  });

  it('frames caros y espaciados SÍ degradan', () => {
    // Regresión del agujero que dejaba el umbral de contigüidad: cada frame
    // cuesta 400 ms (2.5 fps reales) y llegan cada 450 ms. Antes se descartaban
    // por superar `maxDelta` y el guardián no bajaba nunca de escalón.
    const fb = new FrameBudget({ warmup: 0 });
    const steps: string[] = [];
    for (let i = 0; i < 60; i++) {
      const s = fb.push(0.4, 0.45);
      if (s) steps.push(s);
    }
    expect(steps[0]).toBe('dpr1.5');
    expect(steps).toContain('poster');
  });

  it('una pausa larga no cuenta como frame lento', () => {
    const fb = new FrameBudget({ warmup: 0 });
    let s: string | null = null;
    for (let i = 0; i < 50; i++) s = fb.push(5, 5) ?? s;   // 5 s por frame: depurador, no lentitud
    expect(s).toBeNull();
  });
});
