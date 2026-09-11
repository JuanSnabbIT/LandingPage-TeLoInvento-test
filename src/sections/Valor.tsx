import { useRef } from 'react';
import './Valor.css';
import { useSceneSlot } from '../scene/useSceneSlot';

/** Ported 1:1 from reference/maqueta-aprobada.html's `<section class="valor" id="valor">`. */
export function Valor() {
  // Scene stage box for the Central -- see spec 13 §3.3.
  const ref = useRef<HTMLDivElement>(null);
  // Encuadre: el WiFi es plano y ancho: puede crecer más que los demás sin salirse del alto de la caja.
  useSceneSlot({ id: 'valor', anchorRef: ref, fit: 1.35, pose: 'tresCuartos', surface: 'dark' });
  return (
    <section className="valor" id="valor">
      <div className="wrap grid">
        <div>
          <div className="eyebrow">VALOR DE NEGOCIO</div>
          <h2>Control y visibilidad donde más importa</h2>
          <p className="lead">
            La plataforma central convierte el riego y la seguridad en decisiones informadas y
            automatizadas.
          </p>
          <div className="stat-grid">
            <div className="stat">
              <div className="num">24/7</div>
              <h4>Supervisión continua</h4>
              <p>Riego y perímetro monitoreados en todo momento, con alertas inmediatas.</p>
            </div>
            <div className="stat">
              <div className="num">2</div>
              <h4>Sets listos para instalar</h4>
              <p>Riego y seguridad perimetral, disponibles hoy.</p>
            </div>
            <div className="stat">
              <div className="num">1</div>
              <h4>Plataforma central</h4>
              <p>Un solo lugar para operar, automatizar y notificar.</p>
            </div>
          </div>
        </div>
        <div ref={ref} className="visual">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" />
          </svg>
        </div>
      </div>
    </section>
  );
}
