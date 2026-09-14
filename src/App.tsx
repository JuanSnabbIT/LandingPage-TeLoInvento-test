import { useRef } from 'react';
import './App.css';
import './styles/tokens.css';
import { PersistentSceneLayer } from './scene/PersistentSceneLayer';
import { PageSceneHost } from './scene/PageSceneHost';
import { useSectionReveals } from './motion/useSectionReveals';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { useTramoScrubs } from './motion/useTramoScrubs';
import { Header } from './sections/Header';
import { Hero } from './sections/Hero';
import { Problema } from './sections/Problema';
import { Solucion } from './sections/Solucion';
import { Capacidades } from './sections/Capacidades';
import { Valor } from './sections/Valor';
import { Proceso } from './sections/Proceso';
import { Contacto } from './sections/Contacto';
import { Footer } from './sections/Footer';

/**
 * The full page: all 9 sections in document order, ported from
 * reference/maqueta-aprobada.html (read-only, not modified).
 *
 * The persistent r3f canvas (`PersistentSceneLayer` + `PageSceneHost`)
 * mounts once at the app root, not inside any section -- see
 * docs/architecture/3d-web-standard.md §2/§7. Each section registers its
 * own stage box with `useSceneSlot` -- the Hero too (`hero-display`): since
 * 2026-09-14 the logo cloud anchors to `.hero__anchor` like any other slot.
 */

/**
 * Hooks can't be called conditionally and the tramo ScrollTriggers must be
 * built only after every section's `useSceneSlot` effect has registered its
 * anchor -- so the scroll driver lives in its own null-rendering component
 * that App mounts *after* the sections (see spec 13 §3.3).
 */
function TramoScrubs({ reduced }: { reduced: boolean }) {
  useTramoScrubs(reduced);
  return null;
}

function App() {
  const mainRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  useSectionReveals(mainRef);

  return (
    <>
      <PersistentSceneLayer>
        <PageSceneHost reduced={reduced} />
      </PersistentSceneLayer>

      <Header />
      <main ref={mainRef} className="page-content">
        <Hero />
        <Problema />
        <Solucion />
        <Capacidades />
        <Valor />
        <Proceso />
        <Contacto />
      </main>
      <Footer />
      <TramoScrubs reduced={reduced} />
    </>
  );
}

export default App;
