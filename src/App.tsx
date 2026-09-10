import { useRef } from 'react';
import './App.css';
import './styles/tokens.css';
import { PersistentSceneLayer } from './components/canvas/PersistentSceneLayer';
import { HeroCentralSection } from './scenes/hero-central/HeroCentralSection';
import { useDisplayProgress } from './hooks/useDisplayProgress';
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
function App() {
  const heroAnchorRef = useRef<HTMLDivElement>(null);
  const { progressRef } = useDisplayProgress();

  return (
    <>
      <PersistentSceneLayer>
        <HeroCentralSection anchorRef={heroAnchorRef} progressRef={progressRef} />
      </PersistentSceneLayer>

      <Header />
      <main className="page-content">
        <Hero anchorRef={heroAnchorRef} />
        <Problema />
        <Solucion />
        <Capacidades />
        <Hogar />
        <Valor />
        <Proceso />
        <Contacto />
      </main>
      <Footer />
    </>
  );
}

export default App;
