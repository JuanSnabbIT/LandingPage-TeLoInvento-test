import { useMemo, useRef } from 'react';
import { Leva } from 'leva';
import './App.css';
import './styles/tokens.css';
import { PersistentSceneLayer } from './components/canvas/PersistentSceneLayer';
import { HeroCentralSection } from './scenes/hero-central/HeroCentralSection';
import { useDisplayProgress } from './hooks/useDisplayProgress';
import { useSectionReveals } from './hooks/useSectionReveals';
import { useChoreographyScroll } from './hooks/useChoreographyScroll';
import { Header } from './sections/Header';
import { Hero } from './sections/Hero';
import { Problema } from './sections/Problema';
import { Solucion } from './sections/Solucion';
import { Capacidades } from './sections/Capacidades';
import { Hogar } from './sections/Hogar';
import { Valor } from './sections/Valor';
import { Proceso } from './sections/Proceso';
import { Contacto } from './sections/Contacto';
import { Footer } from './sections/Footer';

/**
 * T10: full page, ported from reference/maqueta-aprobada.html (read-only,
 * not modified), all 9 sections in document order. The persistent r3f
 * canvas (PersistentSceneLayer) mounts once at the app root, not inside
 * Hero -- see docs/architecture/3d-web-standard.md §2/§7 and the T9
 * follow-up. `heroAnchorRef` is Hero's invisible layout marker
 * (`.hero__anchor`); the scene reads its on-screen position to place the
 * Central+logo group there.
 *
 * `progressRef` (see useDisplayProgress.ts) currently only drives the
 * particles' local flat->exploded dispersal, scrubbed by hand via a leva
 * debug slider -- no real scroll trigger exists yet, that's later work.
 */
// The leva slider (useDisplayProgress) is a dev harness, not product UI:
// only shown when the page is opened with `?debug`.
const SHOW_DEBUG_PANEL =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');

function App() {
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroAnchorRef = useRef<HTMLDivElement>(null);
  const problemaVisualRef = useRef<HTMLDivElement>(null);
  const solucionVisualRef = useRef<HTMLDivElement>(null);
  const valorVisualRef = useRef<HTMLDivElement>(null);
  // T11: solid product models fitted into section boxes, all drawn by the
  // one persistent canvas. Exported headlessly from assets-source/*.blend
  // (see the vault's 05-inventario-assets.md for provenance).
  const sectionModels = useMemo(
    () => [
      { url: '/models/solucion/central-kiosk.glb', anchorRef: solucionVisualRef, fit: 0.82, tilt: 0.12, yaw: -0.5 },
      { url: '/models/valor/central-stand.glb', anchorRef: valorVisualRef, fit: 0.72, tilt: 0.22, yaw: 0.6 },
    ],
    [],
  );
  const { progressRef, setProgress } = useDisplayProgress();
  const mainRef = useRef<HTMLElement>(null);
  useSectionReveals(mainRef);
  useChoreographyScroll(heroSectionRef, problemaVisualRef, setProgress);

  return (
    <>
      <Leva hidden={!SHOW_DEBUG_PANEL} />
      <PersistentSceneLayer>
        <HeroCentralSection
          anchorRef={heroAnchorRef}
          targetAnchorRef={problemaVisualRef}
          models={sectionModels}
          progressRef={progressRef}
        />
      </PersistentSceneLayer>

      <Header />
      <main ref={mainRef} className="page-content">
        <Hero sectionRef={heroSectionRef} anchorRef={heroAnchorRef} />
        <Problema visualRef={problemaVisualRef} />
        <Solucion visualRef={solucionVisualRef} />
        <Capacidades />
        <Hogar />
        <Valor visualRef={valorVisualRef} />
        <Proceso />
        <Contacto />
      </main>
      <Footer />
    </>
  );
}

export default App;
