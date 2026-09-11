import type { CSSProperties, ReactNode } from 'react';

// Above `.page-content` (z 1) so the particle cloud can land on top of the
// section boxes it travels between, below the sticky Header (z 20). The
// cloud is kept off text not by z-order but by a renderer scissor clipped
// to the anchor rects it travels between (see cloud/ParticleCloud, next task).
const style: CSSProperties = { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 };

export function PersistentSceneLayer({ children }: { children: ReactNode }) { return <div style={style} aria-hidden="true">{children}</div>; }
