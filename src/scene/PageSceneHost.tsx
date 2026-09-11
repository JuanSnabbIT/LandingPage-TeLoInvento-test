import { lazy, Suspense, useCallback, useEffect, useState, type RefObject } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
    document.documentElement.classList.remove('scene-poster');
    // `.scene-v2` is what reveals `.capacidades__stage` (220 px + 24 px of
    // margin), so adding it pushes Valor/Proceso/Contacto ~244 px down. The
    // tramo ScrollTriggers have already cached their start/end in px by now,
    // so without this re-measure tramos 3-6 fire ~244 px too early for the
    // whole session (QA T24). rAF so the new layout is flushed first.
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, []);
  useEffect(
    () => () => document.documentElement.classList.remove('scene-3d', 'scene-v2', 'scene-poster'),
    [],
  );
  useEffect(() => {
    // No canvas is going to mount (or it just degraded away): fall back to
    // the DOM poster instead of leaving `.hero__anchor` empty.
    if (degraded || !webgl) {
      document.documentElement.classList.remove('scene-3d', 'scene-v2');
      document.documentElement.classList.add('scene-poster');
      requestAnimationFrame(() => ScrollTrigger.refresh()); // same layout shift, in reverse
    }
  }, [degraded, webgl]);
  if (!webgl || degraded) return null;
  return (
    <Suspense fallback={null}>
      <PageSceneCanvas heroAnchorRef={heroAnchorRef} reduced={reduced} onStep={onStep} onReady={onReady} />
    </Suspense>
  );
}
