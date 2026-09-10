import { useRef, type RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useDissolveLab } from '../scenes/hero-central/dissolveLab';
import './Hero.css';

gsap.registerPlugin(ScrollTrigger);

interface HeroProps {
  /** Forwarded to App.tsx's PersistentSceneLayer/HeroCentralSection -- see Hero.css for why this is an anchor, not a rendered box. */
  anchorRef: RefObject<HTMLDivElement | null>;
  /** Scroll-driven 0..1 for the logo particles' dissolve (useDisplayProgress.setProgress). */
  onProgress: (value: number) => void;
}

/**
 * Ported from reference/maqueta-aprobada.html's `<section class="hero dark">`,
 * restructured into two explicit parts per the project owner's direction:
 * part 1 is the copy (headline/sub/CTA), part 2 is the product presentation
 * (the Central, and only the Central -- it doesn't appear anywhere else on
 * the page). See Hero.css for the "no boxed container" deviation, unchanged.
 *
 * No scroll pin: the r3f group reads `.hero__anchor`'s live rect every
 * frame (see HeroCentralScene.tsx), which already keeps the Central glued
 * to the page without lag, so the section just flows normally into
 * Problema like every other section (a pin left a blank spacer gap
 * between Hero and Problema in the full-page layout).
 */
export function Hero({ anchorRef, onProgress }: HeroProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const { pin, lengthVh } = useDissolveLab();

  // T12 (exploration): the dissolve is scrubbed by the Hero's own scroll,
  // starting once the whole product stage is on screen (Hero's bottom
  // reaches the viewport bottom) so the device is fully visible while it
  // plays. Without pin, it plays while the Hero scrolls away; with pin,
  // the Hero holds still for `lengthVh` and the dissolve plays in place.
  // Both are candidates; which one ships is the open Capa-2 decision.
  useGSAP(
    () => {
      if (!heroRef.current) return;
      ScrollTrigger.create({
        trigger: heroRef.current,
        start: 'bottom bottom',
        end: `+=${lengthVh}%`,
        pin,
        scrub: true,
        onUpdate: (self) => onProgress(self.progress),
      });
    },
    { scope: heroRef, dependencies: [pin, lengthVh, onProgress], revertOnUpdate: true },
  );

  return (
    <section ref={heroRef} className="hero dark">
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
        <div ref={anchorRef} className="hero__anchor" aria-hidden="true" />
      </div>
    </section>
  );
}
