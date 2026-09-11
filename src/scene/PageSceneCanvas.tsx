import { Suspense, useEffect, useState, type RefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import { PageCamera } from './PageCamera';
import { SceneLights } from './SceneLights';
import { SceneTicker } from './SceneTicker';
import { FrameBudgetGuard } from './FrameBudgetGuard';
import { SlotErrorBoundary } from './SlotErrorBoundary';
import { HeroCentral } from './hero-central/HeroCentral';
import { ParticleCloud } from './cloud/ParticleCloud';
import { loadManifest, type Manifest } from './cloud/shapeLoader';
import { getDeviceTier } from './deviceTier';
import { registry } from './registry';
import { installSceneDebug, isSceneDebug } from './debug';
import type { BudgetStep } from './frameBudget';

/**
 * `?debug&budget=1`: forces the guard's `minFps` sky-high so it degrades
 * within a couple of frames instead of waiting for a real slow device --
 * used by `e2e/scene-budget.spec.ts` (T25). Requires `?debug` too so it
 * can't be triggered by accident in a shared link.
 */
function forcedBudgetOptions(): { minFps: number; warmup: number } | undefined {
  if (!isSceneDebug()) return undefined;
  if (typeof window === 'undefined') return undefined;
  if (new URLSearchParams(window.location.search).get('budget') !== '1') return undefined;
  return { minFps: 1000, warmup: 0 };
}

export default function PageSceneCanvas({
  heroAnchorRef,
  reduced,
  onStep,
  onReady,
}: {
  heroAnchorRef: RefObject<HTMLElement | null>;
  reduced: boolean;
  onStep: (s: BudgetStep) => void;
  onReady: () => void;
}) {
  const [tier] = useState(getDeviceTier);
  const [dprMax, setDprMax] = useState(tier.dpr[1]);
  const [curl, setCurl] = useState(tier.curl);
  const [forcedReduced, setForcedReduced] = useState(false);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    loadManifest().then(setManifest).catch((e) => console.error('[scene] manifest', e));
  }, []);
  useEffect(() => installSceneDebug(tier, reduced || forcedReduced), [tier, reduced, forcedReduced]);
  // Un resize cambia el viewport de r3f y las cajas ancla del DOM, pero no
  // toca `registry` -- sin esto el ticker se queda en idle y la nube se
  // dibuja contra el layout viejo hasta el siguiente scroll (fuente dirty, spec §8).
  useEffect(() => {
    window.addEventListener('resize', registry.markDirty);
    return () => { window.removeEventListener('resize', registry.markDirty); };
  }, []);
  // Pérdida/recuperación de contexto WebGL (spec §7). `preventDefault()` en
  // `webglcontextlost` es lo que habilita a que el navegador *pueda* restaurar
  // el contexto; mientras tanto se degrada al póster del DOM igual que el
  // guardián de frame-budget, así el Hero no queda con un canvas muerto.
  useEffect(() => {
    if (!canvasEl) return;
    const onLost = (e: Event) => { e.preventDefault(); onStep('poster'); };
    const onRestored = () => { registry.markDirty(); };
    canvasEl.addEventListener('webglcontextlost', onLost);
    canvasEl.addEventListener('webglcontextrestored', onRestored);
    return () => {
      canvasEl.removeEventListener('webglcontextlost', onLost);
      canvasEl.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [canvasEl, onStep]);
  const step = (s: BudgetStep) => {
    if (isSceneDebug()) console.info('[scene] budget step', s);
    if (s === 'dpr1.5') setDprMax(1.5);
    else if (s === 'dpr1') setDprMax(1);
    else if (s === 'noCurl') setCurl(false);
    else if (s === 'reduced') setForcedReduced(true);
    else onStep(s);
  };
  if (!manifest) return null;
  return (
    <Canvas
      frameloop="never"
      dpr={[1, dprMax]}
      gl={{ antialias: false, powerPreference: 'high-performance', premultipliedAlpha: true }}
      onCreated={({ gl }) => { setCanvasEl(gl.domElement); registry.markDirty(); }}
    >
      <PageCamera />
      <SceneLights />
      <SceneTicker />
      <FrameBudgetGuard
        onStep={step}
        active={() => performance.now() - registry.lastDirtyAt() < 1000}
        options={forcedBudgetOptions()}
      />
      <SlotErrorBoundary name="hero">
        <Suspense fallback={null}>
          <HeroCentral anchorRef={heroAnchorRef} animate={!reduced} />
        </Suspense>
      </SlotErrorBoundary>
      <SlotErrorBoundary name="cloud">
        <Suspense fallback={null}>
          <ParticleCloud manifest={manifest} lod={tier.lod} reduced={reduced || forcedReduced} curl={curl} />
          <Ready onReady={onReady} />
        </Suspense>
      </SlotErrorBoundary>
    </Canvas>
  );
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
    registry.markDirty();
  }, [onReady]);
  return null;
}
