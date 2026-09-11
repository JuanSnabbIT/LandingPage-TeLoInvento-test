import type { CSSProperties, ReactNode } from 'react';

// Above `.page-content` (z 1) so the particle cloud can land on top of the
// section boxes it travels between, below the sticky Header (z 20). The
// cloud is kept off text not by z-order but by a renderer scissor that
// follows the swarm's own corridor between its two stage boxes — the union
// of the two full boxes at rest (t=0/1), narrowing to a segment tracking
// the particles' progress while travelling between them (see
// cloud/scissor.ts `corridorRect`, used from cloud/ParticleCloud.tsx).
const style: CSSProperties = { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 };

export function PersistentSceneLayer({ children }: { children: ReactNode }) { return <div style={style} aria-hidden="true">{children}</div>; }
