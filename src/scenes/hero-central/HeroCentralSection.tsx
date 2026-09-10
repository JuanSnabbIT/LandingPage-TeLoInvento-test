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
  // trackScroll:true -- without it, the anchor's on-screen position is
  // measured once (mount/resize only) and never again, so the group
  // freezes at that screen coordinate forever. Since PersistentSceneLayer
  // is position:fixed covering the whole viewport, a frozen anchor makes
  // the Central appear to float over every later section as the page
  // scrolls, instead of scrolling away together with Hero -- exactly the
  // bug this fixes. Not Capa-2-specific (that was travel to ANOTHER
  // section's anchor, deliberately not built yet) -- this is just making
  // Hero's own anchor track where Hero itself actually is on screen.
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

  if (webglOk === false) return <AnchoredPoster anchor={anchor} />;
  if (!ready || !anchor.ready) return <AnchoredPoster anchor={anchor} />;

  return (
    <CanvasErrorBoundary fallback={<AnchoredPoster anchor={anchor} />}>
      <Suspense fallback={<AnchoredPoster anchor={anchor} />}>
        <HeroCentralCanvas animate={!prefersReducedMotion} anchor={anchor} progressRef={progressRef} />
      </Suspense>
    </CanvasErrorBoundary>
  );
}
