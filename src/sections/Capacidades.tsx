import { useRef, useState } from 'react';
import './Capacidades.css';
import { useSceneSlot } from '../scene/useSceneSlot';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { driveCapacidadesCarousel } from '../scene/cloud/capacidadesCarousel';
import { CAROUSEL_TRAMOS } from '../scene/cloud/sequence';
import { HogarWaitlist } from './HogarWaitlist';

/** Mismo corte que `.capacidades__stage` en el CSS: 280 px de caja en desktop, 180 en teléfono. */
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
 * Carrusel de tres tarjetas (rediseño 2026-09-14): los dos sets disponibles
 * y el Set Hogar (próximamente, con su lista de espera -- antes era una
 * sección aparte). "Plataforma Central" vive en Contacto. El modelo 3D de
 * la tarjeta activa se anima con un click, no con scroll (ver
 * capacidadesCarousel.ts y los tramos `driver: 'manual'` en sequence.ts).
 */
export function Capacidades() {
  const stageRef = useRef<HTMLDivElement>(null);
  const ancha = useMediaQuery(ANCHA);
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  // `frontal` (no `tresCuartos`): riego/seguridad son modelos planos (aspersor
  // con sus chorros, escudo) -- de perfil se leen mucho peor que de frente.
  // `fit` ~1: el escudo y la casa son altos y llenan la caja a lo largo; con
  // más, se salen de la tarjeta por arriba y pisan el título.
  useSceneSlot({ id: 'capacidades', anchorRef: stageRef, fit: ancha ? 1.05 : 0.95, pose: 'frontal', surface: 'light' });

  const go = (next: number) => {
    if (next < 0 || next >= CARDS.length || next === index) return;
    setIndex(next);
    driveCapacidadesCarousel(next, CAROUSEL_TRAMOS, reduced);
  };

  const active = CARDS[index];

  return (
    <section className="capacidades" id="capacidades">
      <div className="wrap">
        <div className="eyebrow">CAPACIDADES</div>
        <h2>Dos sets, una plataforma, control total</h2>
        <p className="lead">
          Cada set se configura según lo que necesita su operación. Elija el set y lo armamos a su
          medida.
        </p>
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
          <div className="capacidades__card">
            <div ref={stageRef} className="capacidades__stage" aria-hidden="true" />
            <div className="icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                {active.icon}
              </svg>
            </div>
            {active.soon && <span className="capacidades__tag">Próximamente</span>}
            <h3>{active.title}</h3>
            <p>{active.body}</p>
            {active.soon && <HogarWaitlist />}
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
    </section>
  );
}
