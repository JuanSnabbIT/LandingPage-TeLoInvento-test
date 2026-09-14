import { useRef } from 'react';
import './Problema.css';
import { useSceneSlot } from '../scene/useSceneSlot';

/** Ported 1:1 from reference/maqueta-aprobada.html's `<section class="problema">`. */
export function Problema() {
  // The scene draws the Nodo cloud into this box; `useSceneSlot` registers
  // it and reads its live rect every frame (spec 13 §3.3).
  const ref = useRef<HTMLDivElement>(null);
  // Encuadre: el nodo llena ~1.05 del alto de la caja (548x280): su lado mayor es la profundidad, que bajo la pose se reparte entre alto y ancho.
  useSceneSlot({ id: 'problema', anchorRef: ref, fit: 1.04, pose: 'tresCuartos', surface: 'light' });
  return (
    <section className="problema">
      <div className="wrap grid">
        <div>
          <div className="eyebrow">EL PROBLEMA</div>
          <h2>Riego y seguridad aún dependen de procesos manuales y fragmentados</h2>
          <p className="lead">
            Las operaciones agrícolas e industriales enfrentan los mismos desafíos: riego
            ineficiente, brechas de seguridad perimetral y soluciones IoT que prometen más de lo
            que entregan.
          </p>
          <ul>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3s7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 7-12 7-12Z" />
              </svg>
              El riego manual desperdicia agua y no responde a las condiciones reales del terreno.
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" />
              </svg>
              Los perímetros extensos quedan sin supervisión continua y las alertas llegan tarde.
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 8v4l3 2" />
              </svg>
              Soluciones que exigen ensamblar piezas, integrar sistemas y depender de la app para
              todo.
            </li>
          </ul>
        </div>
        <div ref={ref} className="visual">
          <span className="scene-caption">Dispositivos que deben trabajar como un sistema</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="4" y="4" width="16" height="16" rx="3" />
            <path d="M8 12h8M12 8v8" />
          </svg>
        </div>
      </div>
    </section>
  );
}
