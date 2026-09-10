import type { CSSProperties, ReactNode } from 'react';

const containerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

interface ScenePosterProps {
  children: ReactNode;
}

/**
 * Generic static-fallback shell for any canvas scene: absolutely fills its
 * (position: relative) parent and centers whatever poster content the scene
 * provides. Used for prefers-reduced-motion, missing WebGL/WebGPU, and
 * persistent context-loss -- never a blank stage.
 *
 * The shell is intentionally content-agnostic; each scene supplies its own
 * poster illustration (e.g. HeroCentralPoster.tsx) as children so this stays
 * reusable across scenes per docs/architecture/3d-web-standard.md §3/§7.
 */
export function ScenePoster({ children }: ScenePosterProps) {
  return <div style={containerStyle}>{children}</div>;
}
