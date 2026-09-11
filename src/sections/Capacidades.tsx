import { useRef } from 'react';
import './Capacidades.css';
import { useSceneSlot } from '../scene/useSceneSlot';

/** Ported 1:1 from reference/maqueta-aprobada.html's `<section class="capacidades" id="capacidades">`. */
export function Capacidades() {
  const stageRef = useRef<HTMLDivElement>(null);
  // `fit` es fracción del lado MENOR de la caja (anchoring.ts) y esta caja es una
  // franja 1137x220: con el 0.72 del resto de los slots la fila de sensores salía
  // de 158 px de ancho, tres manchitas ilegibles (QA T24). 1.45 la deja en ~285 x
  // 175 px, o sea ~80% del alto de la franja -- que es el límite real, no el ancho.
  useSceneSlot({ id: 'capacidades', anchorRef: stageRef, fit: 1.45, pose: 'tresCuartos', surface: 'light' });
  return (
    <section className="capacidades" id="capacidades">
      <div className="wrap">
        <div className="eyebrow">CAPACIDADES</div>
        <h2>Dos sets, una plataforma, control total</h2>
        <p className="lead">
          Cada set se configura según lo que necesita su operación. Elija el set y lo armamos a su
          medida.
        </p>
        <div ref={stageRef} className="capacidades__stage" aria-hidden="true" />
        <div className="card-grid">
          <div className="card">
            <div className="icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3s7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 7-12 7-12Z" />
              </svg>
            </div>
            <h3>Set de Riego</h3>
            <p>
              Central + nodos de activación de riego y sensor de humedad, para regar con precisión
              según las condiciones del terreno.
            </p>
          </div>
          <div className="card">
            <div className="icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" />
              </svg>
            </div>
            <h3>Set de Seguridad Perimetral</h3>
            <p>
              Central + nodos de sensor de proximidad que cubren su perímetro y alertan ante
              cualquier ingreso.
            </p>
          </div>
          <div className="card">
            <div className="icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="4" y="4" width="7" height="7" rx="1.5" />
                <rect x="13" y="4" width="7" height="7" rx="1.5" />
                <rect x="4" y="13" width="7" height="7" rx="1.5" />
                <rect x="13" y="13" width="7" height="7" rx="1.5" />
              </svg>
            </div>
            <h3>Plataforma Central</h3>
            <p>
              Una Central con pantalla conectada a la web y la app, para operar y recibir
              notificaciones desde cualquier lugar.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
