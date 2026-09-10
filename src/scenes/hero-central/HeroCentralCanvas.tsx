import { useCallback, useState, type RefObject } from 'react';
import { useGLTF, useProgress } from '@react-three/drei';
import { SceneCanvas } from '../../components/canvas/SceneCanvas';
import { PageCamera } from '../../components/canvas/PageCamera';
import { AnchoredPoster } from './AnchoredPoster';
import { HeroCentralScene } from './HeroCentralScene';
import { getDeviceTier } from './deviceTier';
import type { ViewportAnchor } from '../../hooks/useElementViewportAnchor';

const LOGO_URL = '/models/hero-central/logo-lod1.glb';
useGLTF.preload(LOGO_URL);

interface HeroCentralCanvasProps {
  /** false when prefers-reduced-motion is set -- gates mouse parallax only. */
  animate: boolean;
  /** Readiness/poster-fallback only -- NOT used for the live group position, see HeroCentralScene.tsx. */
  anchor: ViewportAnchor;
  /** The raw DOM ref -- read directly every r3f frame for the group's live position (see HeroCentralScene.tsx). */
  anchorRef: RefObject<HTMLElement | null>;
  /** 0..1 scroll-driven progress, read every frame regardless of `animate`. */
  progressRef: RefObject<number>;
}

/**
 * The actual scene content mounted inside the persistent, page-level
 * <Canvas> (see PersistentSceneLayer in App.tsx). Split into its own
 * module so HeroCentralSection.tsx can `lazy()` it -- keeps three.js/r3f
 * out of the main bundle and off the critical path for first paint.
 */
export default function HeroCentralCanvas({ animate, anchor, anchorRef, progressRef }: HeroCentralCanvasProps) {
  const [tier] = useState(getDeviceTier);
  const [contextLost, setContextLost] = useState(false);
  // drei's loader store -- readable OUTSIDE the <Canvas>, which is where a
  // DOM poster must live. `active` is true while any useGLTF/useLoader
  // request in the scene is still in flight.
  const loading = useProgress((state) => state.active);

  const handleContextLost = useCallback(() => setContextLost(true), []);
  const handleContextRestored = useCallback(() => setContextLost(false), []);

  return (
    <>
      <SceneCanvas
        dpr={tier.dpr}
        // Always rendering (not "demand" when reduced-motion) on purpose:
        // uProgress is scroll-driven and must keep updating/rendering
        // regardless of prefers-reduced-motion (it's a content-position
        // change, not "motion"), and driving that correctly under
        // "demand" would need an `invalidate()` call reachable from
        // outside the Canvas tree -- which pulls @react-three/fiber (and
        // three.js with it) into the main bundle, undoing the lazy-load
        // split below. Not worth that complexity/cost for this harness.
        frameloop="always"
        // No DOM fallback INSIDE the canvas: r3f throws ("Div is not part
        // of the THREE namespace") for any HTML element in its tree, which
        // turned the perfectly normal "GLB still loading" state into a
        // caught error -> permanent poster on slower loads. The loading
        // poster is rendered as a sibling below instead (useProgress).
        fallback={null}
        onContextLost={handleContextLost}
        onContextRestored={handleContextRestored}
      >
        <PageCamera />
        <HeroCentralScene
          maxParticles={tier.maxParticles}
          animate={animate}
          anchorRef={anchorRef}
          progressRef={progressRef}
        />
      </SceneCanvas>

      {/* Context loss overlays the poster near the same anchor rather than
          unmounting the canvas -- WebGL auto-restore can bring the
          context back without us tearing anything down. */}
      {contextLost ? (
        <AnchoredPoster anchor={anchor} reason="context-lost" />
      ) : loading ? (
        <AnchoredPoster anchor={anchor} reason="loading" />
      ) : null}
    </>
  );
}
