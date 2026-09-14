import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import type { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import './Capacidades.css';
import { useSceneSlot } from '../scene/useSceneSlot';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { driveCapacidadesCarousel, setCapacidadesPosition } from '../scene/cloud/capacidadesCarousel';
import { CAROUSEL_TRAMOS } from '../scene/cloud/sequence';
import { isSceneDebug } from '../scene/debug';
import { setupScrollTrigger } from '../motion/scrollTrigger';
import { motion } from '../motion/tokens';
import { HogarWaitlist } from './HogarWaitlist';

/** Mismo corte que el CSS: arriba, dos mitades con scroll horizontal fijado y caja de 280 px; abajo, carrusel por click con caja de 180. */
const ANCHA = '(min-width: 901px)';

/** Mismo orden que `CAPACIDADES_CARDS` (capacidadesCarousel.ts): el índice acá ES la tarjeta activa del carrusel. */
const CARDS = [
  {
    id: 'riego',
    title: 'Set de Riego',
    body: 'Central + nodos de activación de riego y sensor de humedad, para regar con precisión según las condiciones del terreno.',
    icon: <path d="M12 3s7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 7-12 7-12Z" />,
    soon: false,
  },
  {
    id: 'seguridad',
    title: 'Set de Seguridad Perimetral',
    body: 'Central + nodos de sensor de proximidad que cubren su perímetro y alertan ante cualquier ingreso.',
    icon: <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" />,
    soon: false,
  },
  {
    id: 'hogar',
    title: 'Set Hogar',
    body: 'La misma plataforma, pensada para el hogar. Todavía en desarrollo: déjenos su correo y le avisamos cuando esté disponible.',
    icon: <path d="M4 11.5 12 4l8 7.5M6 10v9h12v-9" />,
    soon: true,
  },
] as const;

/**
 * Carrusel de tres tarjetas: los dos sets disponibles y el Set Hogar
 * (próximamente, con su lista de espera). "Plataforma Central" vive en
 * Contacto. Dos mitades: título y bajada a la izquierda
 * (`.capacidades__intro`), carrusel y puntos a la derecha
 * (`.capacidades__showcase`); en ≤900 px se apilan.
 *
 * Desktop (pedido del dueño, 2026-09-14): scroll horizontal con la sección
 * fijada. El texto de la izquierda no se mueve; en la ventana de la derecha
 * (`.capacidades__viewport`) el carril de tarjetas se desliza con el scroll
 * (pin + scrub) y el progreso de los tramos manuales riego → seguridad → hogar
 * sale de la posición REAL del carril (`setCapacidadesPosition`), así el
 * modelo se transforma exactamente al ritmo en que pasan las tarjetas. Los
 * puntos indican la tarjeta y llevan el scroll hasta ella; no hay flechas.
 *
 * Teléfono: el carrusel por click de siempre (flechas + puntos,
 * `driveCapacidadesCarousel`), con las tarjetas apiladas en la misma celda.
 *
 * La caja del modelo (`.capacidades__stage`) NO vive dentro de las tarjetas:
 * es un marcador fijo sobre la ventana, encima del hueco que cada tarjeta
 * reserva arriba (`.capacidades__stage-space`). Así el slot de la nube apunta
 * siempre al mismo elemento y el modelo queda quieto en la ventana mientras
 * las tarjetas pasan por debajo.
 */
export function Capacidades() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<ScrollTrigger | null>(null);
  const ancha = useMediaQuery(ANCHA);
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  // `frontal` (no `tresCuartos`): riego/seguridad son modelos planos (aspersor
  // con sus chorros, escudo) -- de perfil se leen mucho peor que de frente.
  // `fit` ~1: el escudo y la casa son altos y llenan la caja a lo largo; con
  // más, se salen de la tarjeta por arriba y pisan el título.
  useSceneSlot({ id: 'capacidades', anchorRef: stageRef, fit: ancha ? 1.05 : 0.95, pose: 'frontal', surface: 'light' });

  useGSAP(
    () => {
      setupScrollTrigger();
      const mm = gsap.matchMedia();
      mm.add(ANCHA, () => {
        const section = sectionRef.current;
        const track = trackRef.current;
        if (!section || !track) return;
        const cards = Array.from(track.children) as HTMLElement[];
        const step = () => (cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : 0);
        const { scrollPerCard, hold } = motion.capacidades;
        let shown = 0;
        const sync = () => {
          const s = step();
          const pos = s > 0 ? -Number(gsap.getProperty(track, 'x')) / s : 0;
          // Con reduced motion el carril se sigue moviendo con el scroll (lo mueve el usuario), pero el modelo salta de forma.
          setCapacidadesPosition(reduced ? Math.round(pos) : pos, CAROUSEL_TRAMOS);
          const i = Math.round(pos);
          if (i !== shown) {
            shown = i;
            setIndex(i);
          }
        };
        const tl = gsap.timeline({
          onUpdate: sync,
          scrollTrigger: {
            id: 'capacidades-horizontal',
            trigger: section,
            pin: true,
            scrub: true,
            invalidateOnRefresh: true,
            // Centrada si entra en pantalla; si es más alta, desde su borde superior.
            start: () => (section.offsetHeight <= window.innerHeight ? 'center center' : 'top top'),
            end: () => `+=${window.innerHeight * scrollPerCard * (cards.length - 1)}`,
            markers: isSceneDebug(),
          },
        });
        tl.addLabel('card0').to({}, { duration: hold });
        for (let k = 1; k < cards.length; k++) {
          tl.to(track, { x: () => -step() * k, duration: 1, ease: 'power1.inOut' })
            .addLabel(`card${k}`)
            .to({}, { duration: hold });
        }
        pinRef.current = tl.scrollTrigger ?? null;
        return () => {
          pinRef.current = null;
          setCapacidadesPosition(0, CAROUSEL_TRAMOS);
          setIndex(0);
        };
      });
      return () => mm.revert();
    },
    { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true },
  );

  const go = (next: number) => {
    if (next < 0 || next >= CARDS.length) return;
    const pin = pinRef.current;
    if (ancha && pin) {
      window.scrollTo({ top: pin.labelToScroll(`card${next}`), behavior: reduced ? 'auto' : 'smooth' });
      return;
    }
    if (next === index) return;
    setIndex(next);
    driveCapacidadesCarousel(next, CAROUSEL_TRAMOS, reduced);
  };

  return (
    <section ref={sectionRef} className="capacidades" id="capacidades">
      <div className="wrap grid">
        <div className="capacidades__intro">
          <div className="eyebrow">CAPACIDADES</div>
          <h2>Dos sets, una plataforma, control total</h2>
          <p className="lead">
            Cada set se configura según lo que necesita su operación. Elija el set y lo armamos a su
            medida.
          </p>
        </div>
        <div className="capacidades__showcase">
          <div className="capacidades__carousel">
            <button
              type="button"
              className="capacidades__nav capacidades__nav--prev"
              aria-label="Set anterior"
              disabled={index === 0}
              onClick={() => go(index - 1)}
            >
              ‹
            </button>
            <div className="capacidades__viewport">
              <div ref={stageRef} className="capacidades__stage" aria-hidden="true" />
              <div ref={trackRef} className="capacidades__track">
                {CARDS.map((card, i) => (
                  <article
                    key={card.id}
                    className={`capacidades__card${i === index ? ' is-active' : ''}`}
                    inert={i !== index}
                  >
                    <div className="capacidades__stage-space" aria-hidden="true" />
                    <div className="capacidades__body">
                      <div className="icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          {card.icon}
                        </svg>
                      </div>
                      {card.soon && <span className="capacidades__tag">Próximamente</span>}
                      <h3>{card.title}</h3>
                      <p>{card.body}</p>
                      {card.soon && <HogarWaitlist />}
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="capacidades__nav capacidades__nav--next"
              aria-label="Set siguiente"
              disabled={index === CARDS.length - 1}
              onClick={() => go(index + 1)}
            >
              ›
            </button>
          </div>
          <div className="capacidades__dots" role="tablist" aria-label="Sets disponibles">
            {CARDS.map((card, i) => (
              <button
                key={card.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={card.title}
                className={i === index ? 'is-active' : ''}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
