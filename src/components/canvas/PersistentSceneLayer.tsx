import type { CSSProperties, ReactNode } from 'react';

const layerStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  // Above `.page-content` (z 1) so the Capa-2 particle cloud can land ON
  // Problema's light `.visual` box (an opaque section background would
  // otherwise paint over it), below the sticky Header (z 20). The layer
  // is transparent wherever nothing is drawn, so page text is unaffected.
  zIndex: 5,
};

interface PersistentSceneLayerProps {
  children: ReactNode;
}

/**
 * App-root mount point for THE persistent r3f canvas layer, per
 * docs/architecture/3d-web-standard.md §2/§7: a single canvas lives for
 * the whole page's lifetime; sections contribute content/groups into it
 * (hero-central today, more later), they don't each get their own boxed
 * <Canvas>. Fixed + full-viewport + pointer-events:none (nothing needs
 * hover yet -- revisit if/when something does) + z-index:0 so page text
 * (given its own stacking context, see .hero-harness) always reads on
 * top of whatever renders in here.
 *
 * This div itself has no width/height/background -- `inset:0` on a fixed
 * element already covers the viewport; anything drawn inside is free to
 * visually extend wherever the scene positions it, nothing here clips it.
 */
export function PersistentSceneLayer({ children }: PersistentSceneLayerProps) {
  return (
    <div style={layerStyle} aria-hidden="true">
      {children}
    </div>
  );
}
