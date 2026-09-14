import { describe, it, expect, vi } from 'vitest';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setupScrollTrigger, createScrub } from './scrollTrigger';

describe('scrollTrigger', () => {
  it('setup configura ignoreMobileResize una sola vez', () => {
    const spy = vi.spyOn(ScrollTrigger, 'config');
    setupScrollTrigger();
    setupScrollTrigger();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ ignoreMobileResize: true }));
  });

  it('createScrub sigue el scroll directamente sin retraso temporal', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    document.body.append(a, b);
    const kill = createScrub({ trigger: a, start: 'top top', endTrigger: b, end: 'top top', onUpdate: () => {} });
    const st = ScrollTrigger.getAll().at(-1)!;
    expect(st.animation).toBeInstanceOf(gsap.core.Tween);
    expect(st.vars.scrub).toBe(true);
    kill();
    expect(ScrollTrigger.getAll().includes(st)).toBe(false);
  });
});
