import type { RefObject } from 'react';
import './Proceso.css';

interface ProcesoProps {
  /** App.tsx scrubs this section's scroll into the Nodo's exploded view (useSectionScrub). */
  sectionRef: RefObject<HTMLElement | null>;
  /** T11: the Nodo assembles itself inside this box (ExplodedModel, see App.tsx). */
  visualRef: RefObject<HTMLDivElement | null>;
}

/** Ported 1:1 from reference/maqueta-aprobada.html's `<section class="proceso" id="proceso">`. */
export function Proceso({ sectionRef, visualRef }: ProcesoProps) {
  return (
    <section ref={sectionRef} className="proceso" id="proceso">
      <div className="wrap grid">
        <div ref={visualRef} className="visual">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M4 12h16M4 12l5-5M4 12l5 5" />
          </svg>
        </div>
        <div>
          <div className="eyebrow">CÓMO TRABAJAMOS</div>
          <h2>Del primer contacto a la operación</h2>
          <p className="lead">
            Un proceso claro y acompañado, desde la evaluación hasta la puesta en marcha.
          </p>
          <ol>
            <li>
              <span className="num">1</span>Cuéntenos su operación y su necesidad; definimos el set
              que corresponde.
            </li>
            <li>
              <span className="num">2</span>Armamos el set con los nodos que necesita y lo
              preparamos para instalar.
            </li>
            <li>
              <span className="num">3</span>Instale con guía y soporte técnico (blog de manuales), y
              opere todo desde la Central y la plataforma.
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
