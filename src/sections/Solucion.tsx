import type { RefObject } from 'react';
import './Solucion.css';

interface SolucionProps {
  /** T11: the Central (kiosk concept) is rendered into this box by the persistent canvas (see App.tsx). */
  visualRef: RefObject<HTMLDivElement | null>;
}

/** Ported 1:1 from reference/maqueta-aprobada.html's `<section class="solucion" id="solucion">`. */
export function Solucion({ visualRef }: SolucionProps) {
  return (
    <section className="solucion" id="solucion">
      <div className="wrap grid">
        <div ref={visualRef} className="photo-ph">
          <div className="cap">Central instalada en el hogar — foto real pendiente de producir</div>
        </div>
        <div>
          <div className="eyebrow">LA SOLUCIÓN</div>
          <h2>Una plataforma central. Sets listos para instalar.</h2>
          <p className="lead">
            Cada set combina una Central con pantalla y nodos periféricos personalizables. La
            Central se conecta a la web y la app, y administra todo el sistema: uso rápido,
            notificaciones y automatización sin depender de la aplicación.
          </p>
          <ul>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Central con pantalla para uso rápido y notificaciones
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Nodos personalizables y automatizables
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Instalación simple, con manuales y soporte técnico en el blog
            </li>
          </ul>
          <a className="btn ghost" href="#capacidades">
            Ver los sets
          </a>
        </div>
      </div>
    </section>
  );
}
