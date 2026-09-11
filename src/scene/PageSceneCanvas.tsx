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
import type { BudgetStep } from './frameBudget';

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
  useEffect(() => {
    loadManifest().then(setManifest).catch((e) => console.error('[scene] manifest', e));
  }, []);
  const step = (s: BudgetStep) => {
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
      onCreated={() => { registry.markDirty(); }}
    >
      <PageCamera />
      <SceneLights />
      <SceneTicker />
      <FrameBudgetGuard onStep={step} active={() => performance.now() - registry.lastDirtyAt() < 1000} />
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
