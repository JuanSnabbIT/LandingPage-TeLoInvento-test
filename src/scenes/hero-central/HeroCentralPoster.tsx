import type { CSSProperties } from 'react';

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
};

const captionStyle: CSSProperties = {
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 11,
  fontWeight: 500,
  color: '#a8adb6',
  textAlign: 'center',
  maxWidth: 220,
};

/**
 * Static poster content for the hero-central scene: the same flat brand-mark
 * placeholder icon used in reference/maqueta-aprobada.html's original hero
 * stage (real logo colors #f5a623 / #2b95c3, not the page's Relume blue --
 * same precedent as the maqueta). Shown when WebGL/WebGPU is unavailable or
 * the canvas hits an unrecoverable error; never a blank stage.
 */
export function HeroCentralPoster() {
  return (
    <div style={wrapStyle}>
      <svg viewBox="0 0 24 24" width={64} height={64} fill="none" stroke="#f5a623" strokeWidth={1.6}>
        <rect x="6" y="3" width="12" height="18" rx="2.5" />
        <circle cx="12" cy="17.3" r="0.9" fill="#f5a623" stroke="none" />
        <path d="M9 7h6M9 10h6M9 13h3" stroke="#2b95c3" />
      </svg>
      <span style={captionStyle}>Central con pantalla — vista estática (sin animación 3D en este dispositivo)</span>
    </div>
  );
}
