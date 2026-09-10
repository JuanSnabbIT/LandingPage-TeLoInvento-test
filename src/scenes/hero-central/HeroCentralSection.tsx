import { lazy, Suspense, useEffect, useState, type RefObject } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useElementViewportAnchor } from '../../hooks/useElementViewportAnchor';
import { hasWebglSupport } from '../../components/canvas/webglSupport';
import { CanvasErrorBoundary } from '../../components/canvas/CanvasErrorBoundary';
import { AnchoredPoster } from './AnchoredPoster';

const HeroCentralCanvas = lazy(() => import('./HeroCentralCanvas'));

interface HeroCentralSectionProps {
  /**
   * The DOM element (an invisible layout marker in App.tsx, roughly where
   * the maqueta's old `.hero .stage` box used to be) whose on-screen
   * position anchors the 3D group -- NOT a box the scene renders into or
   * is clipped by.
   */
  anchorRef: RefObject<HTMLElement | null>;
  /** 0..1 scroll-driven progress (see useDisplayProgress.ts), read every frame regardless of reduced-motion. */
  progressRef: RefObject<number>;
}

/**
 * Mount point for the hero-central scene (T9), rendered inside
 * PersistentSceneLayer (the single, page-level, persistent canvas -- see
 * App.tsx and docs/architecture/3d-web-standard.md §2/§7). Decides between
 * the real 3D content and the static poster:
 *  - no WebGL -> poster, permanently, anchored at the same DOM position.
 *  - prefers-reduced-motion -> the real canvas still mounts (Central +
 *    logo particles stay visibly rendered), just with the idle turbulence
 *    and any entrance animation turned off.
 *  - otherwise -> canvas, deferred by two RAFs so it never blocks first
 *    paint of the surrounding page text.
 */
export function HeroCentralSection({ anchorRef, progressRef }: HeroCentralSectionProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  // This React-state anchor is now ONLY for readiness gating and the
  // static poster fallback below -- the live 3D group's position is read
  // directly off `anchorRef` every r3f frame (see HeroCentralScene.tsx),
  // bypassing this scroll-event + setState round trip entirely, since
  // that round trip is what caused a visible lag between the Hero
  // section's real (compositor-driven, instant) scroll position and the
  // group's (React-render-driven, always a frame or more behind)
  // position. trackScroll:true kept anyway so the poster fallback (shown
  // on WebGL loss/error, a rare case) still tracks reasonably rather than
  // freezing at mount.
  const anchor = useElementViewportAnchor(anchorRef, { trackScroll: true });
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setWebglOk(hasWebglSupport());
  }, []);

  useEffect(() => {
    if (webglOk !== true) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [webglOk]);

  if (webglOk === false) return <AnchoredPoster anchor={anchor} reason="no-webgl" />;
  if (!ready || !anchor.ready) return <AnchoredPoster anchor={anchor} reason="not-ready" />;

  return (
    <CanvasErrorBoundary
      fallback={(error) => (
        <AnchoredPoster
          anchor={anchor}
          reason="error"
          detail={error instanceof Error ? `${error.name}: ${error.message}` : String(error)}
        />
      )}
    >
      <Suspense fallback={<AnchoredPoster anchor={anchor} reason="loading" />}>
        <HeroCentralCanvas
          animate={!prefersReducedMotion}
          anchor={anchor}
          anchorRef={anchorRef}
          progressRef={progressRef}
        />
      </Suspense>
    </CanvasErrorBoundary>
  );
}
