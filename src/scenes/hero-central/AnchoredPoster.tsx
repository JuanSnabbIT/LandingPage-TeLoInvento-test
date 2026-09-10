import type { CSSProperties } from 'react';
import type { ViewportAnchor } from '../../hooks/useElementViewportAnchor';
import { HeroCentralPoster } from './HeroCentralPoster';

interface AnchoredPosterProps {
  anchor: ViewportAnchor;
}

/**
 * Static-fallback content positioned at the same DOM anchor point the real
 * 3D group uses (see useElementViewportAnchor) -- shown when WebGL is
 * unavailable, the canvas errors out, or a WebGL context is lost. Fixed +
 * translate(-50%,-50%) so it's centered on the anchor regardless of the
 * poster's own size; pointer-events:none, purely decorative.
 */
export function AnchoredPoster({ anchor }: AnchoredPosterProps) {
  const style: CSSProperties = {
    position: 'fixed',
    left: `${anchor.u * 100}%`,
    top: `${anchor.v * 100}%`,
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  };

  return (
    <div style={style}>
      <HeroCentralPoster />
    </div>
  );
}
