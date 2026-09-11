import { useRef } from 'react';
import './Capacidades.css';
import { useSceneSlot } from '../scene/useSceneSlot';
import { useMediaQuery } from '../hooks/useMediaQuery';

/** Mismo corte que `.capacidades__stage` en el CSS: 320 px de franja arriba, 160 abajo. */
const ANCHA = '(min-width: 901px)';

/** Ported 1:1 from reference/maqueta-aprobada.html's `<section class="capacidades" id="capacidades">`. */
export function Capacidades() {
  const stageRef = useRef<HTMLDivElement>(null);
  // `fit` es fracción del lado MENOR de la caja (anchoring.ts) y escala el lado
  // MAYOR de la forma. Esta caja es una franja (1160x320 en ancho, 350x160 en
  // teléfono), así que en las dos manda el ALTO y `fit` sale del alto proyectado.
  //
  // La cuenta vieja (3.2) medía la fila plana -- 4.7:1, 0.42 de alto normalizado
  // -- y se salía por arriba y por abajo, porque la pose `tresCuartos` inclina la
  // fila: con Euler(0.25, 0.5) el ancho y el fondo se proyectan sobre la vertical
  // y el alto real en pantalla pasa de 0.42 a 0.68 unidades. Con 3.2 eso daba 239
  // px en una franja de 220. A 2.6 el modelo ocupa ~88% del alto de la caja y
  // ~65% de su ancho, entero y sin tocar los bordes.
  //
  // Subir el alto de la franja NO arregla el corte por sí solo: la escala se mide
  // contra el lado menor, así que el modelo crece con la caja y la proporción no
  // cambia. Los 320 px son para que el modelo se lea más grande, no para que
  // entre.
  //
  // En teléfono el 2.0 se queda: ahí el límite es el ancho de pantalla (1.82 x 2.0
  // / 2 x 160 = 291 px de fila, dentro de los ~350 útiles), no el alto.
  const ancha = useMediaQuery(ANCHA);
  useSceneSlot({ id: 'capacidades', anchorRef: stageRef, fit: ancha ? 2.6 : 2.0, pose: 'tresCuartos', surface: 'light' });
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
