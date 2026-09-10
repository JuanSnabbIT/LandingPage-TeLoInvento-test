import type { CSSProperties } from 'react';
import type { ViewportAnchor } from '../../hooks/useElementViewportAnchor';
import { HeroCentralPoster } from './HeroCentralPoster';

export type PosterReason = 'no-webgl' | 'not-ready' | 'loading' | 'error' | 'context-lost';

interface AnchoredPosterProps {
  anchor: ViewportAnchor;
  /** Why the poster is showing instead of the 3D scene -- surfaced as a caption in DEV builds only. */
  reason?: PosterReason;
  /** Extra diagnostic (e.g. the caught error's message), DEV only. */
  detail?: string;
}

const REASON_LABEL: Record<PosterReason, string> = {
  'no-webgl': 'WebGL no disponible en este navegador (hasWebglSupport() = false)',
  'not-ready': 'esperando primer layout / RAF',
  loading: 'cargando chunk de three.js o los GLB (Suspense)',
  error: 'la escena lanzó un error (ver consola: [canvas-scene])',
  'context-lost': 'el navegador perdió el contexto WebGL',
};

const diagStyle: CSSProperties = {
  marginTop: 10,
  fontFamily: 'ui-monospace, monospace',
  fontSize: 11,
  color: '#f0b04a',
  background: 'rgba(0,0,0,0.55)',
  padding: '6px 8px',
  borderRadius: 6,
  maxWidth: 360,
  textAlign: 'center',
  whiteSpace: 'pre-wrap',
};

/**
 * Static-fallback content positioned at the same DOM anchor point the real
 * 3D group uses (see useElementViewportAnchor) -- shown when WebGL is
 * unavailable, the canvas errors out, or a WebGL context is lost. Fixed +
 * translate(-50%,-50%) so it's centered on the anchor regardless of the
 * poster's own size; pointer-events:none, purely decorative.
 */
export function AnchoredPoster({ anchor, reason, detail }: AnchoredPosterProps) {
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
      {import.meta.env.DEV && reason && (
        <div style={diagStyle}>
          [dev] poster: {reason} — {REASON_LABEL[reason]}
          {detail ? `
${detail}` : ''}
        </div>
      )}
    </div>
  );
}
