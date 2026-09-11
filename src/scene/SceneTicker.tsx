import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import { registry } from './registry';

export function shouldRender(now: number, lastDirtyAt: number, dirty: boolean, graceMs: number): boolean {
  return dirty || now - lastDirtyAt < graceMs;
}

/** Un solo loop: gsap.ticker (ScrollTrigger ya actualizó) → advance() de r3f, solo si algo cambió. */
export function SceneTicker({ graceMs = 1000 }: { graceMs?: number }) {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    const tick = (time: number) => {
      const now = performance.now();
      if (shouldRender(now, registry.lastDirtyAt(), registry.consumeDirty(), graceMs)) advance(time * 1000);
    };
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); };
  }, [advance, graceMs]);
  return null;
}
