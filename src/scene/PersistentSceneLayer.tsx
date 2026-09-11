import type { CSSProperties, ReactNode } from 'react';

const style: CSSProperties = { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 };

export function PersistentSceneLayer({ children }: { children: ReactNode }) { return <div style={style} aria-hidden="true">{children}</div>; }
