import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import { registry } from './registry';
import { shouldRender } from './sceneTickerPolicy';

/**
 * Un solo loop: gsap.ticker (ScrollTrigger ya actualizó) → advance() de r3f, solo si algo cambió.
 *
 * `advance(timestamp)` bajo `frameloop="never"` calcula
 * `delta = timestamp - state.clock.elapsedTime` de forma literal (sin pasar
 * por `THREE.Clock.getDelta()`, que sí normaliza ms→s) -- así que el
 * timestamp que se le pasa fija la unidad de `delta` que reciben *todos*
 * los `useFrame` de la escena. `gsap.ticker`'s `time` ya viene en
 * segundos, que es lo que asumen esos consumidores (`FrameBudget.maxDelta`
 * en segundos, `motion.duration.crossfade` = 0.2 s en ParticleCloud,
 * `Math.min(delta, 1/30)` en HeroCentral): pasarlo tal cual, sin `*1000`
 * (bug detectado en T25 -- con `*1000` el guard de frame-budget nunca
 * acumulaba ventana porque cada delta en ms superaba `maxDelta`).
 */
export function SceneTicker({ graceMs = 1000 }: { graceMs?: number }) {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    // A resting morph still moves with its DOM anchor when the page scrolls.
    const invalidate = () => registry.markDirty();
    window.addEventListener('scroll', invalidate, { passive: true });
    window.addEventListener('resize', invalidate);
    window.addEventListener('pageshow', invalidate);
    invalidate();
    const tick = (time: number) => {
      const now = performance.now();
      if (shouldRender(now, registry.lastDirtyAt(), registry.consumeDirty(), graceMs)) {
        // `advance()` corre los useFrame y dibuja, sincrónico: cronometrarlo da
        // el COSTO del frame, que es lo que mira el guardián de rendimiento --
        // el hueco entre frames no sirve, porque acá se dibuja sólo cuando algo
        // cambió y un hueco largo es reposo (ver frameBudget.ts).
        const t0 = performance.now();
        advance(time);
        registry.setFrameCost((performance.now() - t0) / 1000);
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('scroll', invalidate);
      window.removeEventListener('resize', invalidate);
      window.removeEventListener('pageshow', invalidate);
    };
  }, [advance, graceMs]);
  return null;
}
