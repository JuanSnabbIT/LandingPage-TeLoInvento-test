import { useRef, useState } from 'react';
import './Capacidades.css';
import { useSceneSlot } from '../scene/useSceneSlot';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { driveCapacidadesCarousel } from '../scene/cloud/capacidadesCarousel';
import { CAROUSEL_TRAMO_INDEX } from '../scene/cloud/sequence';

/** Mismo corte que `.capacidades__stage` en el CSS: 320 px de franja arriba, 160 abajo. */
const ANCHA = '(min-width: 901px)';

const CARDS = [
  {
    id: 'riego',
    title: 'Set de Riego',
    body: 'Central + nodos de activación de riego y sensor de humedad, para regar con precisión según las condiciones del terreno.',
    icon: <path d="M12 3s7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 7-12 7-12Z" />,
  },
  {
    id: 'seguridad',
    title: 'Set de Seguridad Perimetral',
    body: 'Central + nodos de sensor de proximidad que cubren su perímetro y alertan ante cualquier ingreso.',
    icon: <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" />,
  },
] as const;

/**
 * Carrusel de dos tarjetas (T20/T21 rediseño 2026-09-14): "Plataforma
 * Central" ya no vive acá -- ver Contacto -- así que Capacidades se enfoca
 * en los dos sets disponibles. El modelo 3D de la tarjeta activa se anima
 * con un click, no con scroll (ver capacidadesCarousel.ts y el tramo
 * `driver: 'manual'` en sequence.ts).
 */
export function Capacidades() {
  const stageRef = useRef<HTMLDivElement>(null);
  const ancha = useMediaQuery(ANCHA);
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  // `frontal` (no `tresCuartos`): riego/seguridad son modelos planos (aspersor
  // con sus chorros, escudo) -- de perfil se leen mucho peor que de frente.
  // `fit` ~1: el escudo es alto y llena la caja a lo largo; con más, se sale
  // de la tarjeta por arriba y pisa el título.
  useSceneSlot({ id: 'capacidades', anchorRef: stageRef, fit: ancha ? 1.05 : 0.95, pose: 'frontal', surface: 'light' });

  const go = (next: number) => {
    if (next < 0 || next >= CARDS.length || next === index) return;
    setIndex(next);
    driveCapacidadesCarousel(next, CAROUSEL_TRAMO_INDEX, reduced);
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
            <h3>{active.title}</h3>
            <p>{active.body}</p>
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
