import type { RefObject } from 'react';
import './Hero.css';

interface HeroProps {
  /** Forwarded to App.tsx's PageSceneHost -- see Hero.css for why this is an anchor, not a rendered box. */
  anchorRef: RefObject<HTMLDivElement | null>;
}

/**
 * Ported from reference/maqueta-aprobada.html's `<section class="hero dark">`,
 * restructured into two explicit parts per the project owner's direction:
 * part 1 is the copy (headline/sub/CTA), part 2 is the product presentation
 * (the Central, and only the Central -- it doesn't appear anywhere else on
 * the page). See Hero.css for the "no boxed container" deviation, unchanged.
 *
 * No scroll pin and no ScrollTrigger of its own: the scene reads
 * `.hero__anchor`'s live rect every frame (see src/scene/anchoring.ts), and
 * the tramo progress is driven from App.tsx (useTramoScrubs).
 */
export function Hero({ anchorRef }: HeroProps) {
  return (
    <section className="hero dark">
      <div className="hero__text wrap">
        <div className="eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>
          TELOINVENTO
        </div>
        <h1>Automatización de riego y seguridad perimetral, lista para instalar</h1>
        <p className="sub">
          Sets de dispositivos IoT listos para instalar, administrados desde una plataforma
          central. Controle riego y perímetro desde un solo lugar, sin piezas sueltas ni
          integraciones complejas.
        </p>
        <div className="cta-row">
          <a className="btn primary" href="#contacto">
            Solicitar propuesta
          </a>
        </div>
      </div>

      <div className="hero__stage wrap">
        <div ref={anchorRef} className="hero__anchor" aria-hidden="true">
          <img
            className="hero__poster"
            src="/posters/central-v2.webp"
            alt=""
            width={1200}
            height={900}
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}
