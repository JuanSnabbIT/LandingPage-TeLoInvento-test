import { lazy, Suspense, useCallback, useEffect, useState, type RefObject } from 'react';
import { hasWebgl2 } from './webglSupport';
import type { BudgetStep } from './frameBudget';

const PageSceneCanvas = lazy(() => import('./PageSceneCanvas'));
const KEY = 'teloinvento:scene-v2-degraded';
const TTL = 60 * 60 * 1000;

function readDegraded(): boolean {
  const q = new URLSearchParams(window.location.search);
  if (q.has('no3d')) return true;
  if (q.has('force3d')) return false;
  try {
    const v = sessionStorage.getItem(KEY);
    return !!v && Date.now() - Number(v) < TTL;
  } catch {
    return false;
  }
}

export function PageSceneHost({
  heroAnchorRef,
  reduced,
}: {
  heroAnchorRef: RefObject<HTMLElement | null>;
  reduced: boolean;
}) {
  const [webgl] = useState(() => hasWebgl2());
  const [degraded, setDegraded] = useState(readDegraded);
  const onStep = useCallback((_s: BudgetStep) => {
    try { sessionStorage.setItem(KEY, String(Date.now())); } catch { /* private mode */ }
    setDegraded(true);
  }, []);
  const onReady = useCallback(() => {
    document.documentElement.classList.add('scene-3d', 'scene-v2');
  }, []);
  useEffect(() => () => document.documentElement.classList.remove('scene-3d', 'scene-v2'), []);
  useEffect(() => {
    if (degraded || !webgl) document.documentElement.classList.remove('scene-3d', 'scene-v2');
  }, [degraded, webgl]);
  if (!webgl || degraded) return null;
  return (
    <Suspense fallback={null}>
      <PageSceneCanvas heroAnchorRef={heroAnchorRef} reduced={reduced} onStep={onStep} onReady={onReady} />
    </Suspense>
  );
}
