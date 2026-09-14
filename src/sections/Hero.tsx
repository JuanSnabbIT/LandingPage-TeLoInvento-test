import { useRef } from 'react';
import './Hero.css';
import { useSceneSlot } from '../scene/useSceneSlot';

/**
 * Una sola pantalla (rediseño 2026-09-14, pedido del dueño del proyecto):
 * texto a la izquierda, la ampolleta del logo en partículas a la derecha.
 * `.hero__anchor` es el slot `hero-display` de la nube, como cualquier otra
 * caja de sección -- antes lo daba `HeroCentral` (la Central sólida con el
 * logo dentro de su pantalla), que ya no existe. Giro leve con el puntero
 * como todos los modelos (`motion.parallax`, lo aplica ParticleCloud); las
 * partículas de abajo de la llama parpadean (marcadas en el horneado).
 *
 * Sin scroll pin ni ScrollTrigger propio: la escena lee el rect de la caja
 * cada frame (src/scene/anchoring.ts) y el progreso lo maneja useTramoScrubs.
 */
export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  useSceneSlot({ id: 'hero-display', anchorRef: ref, fit: 1.0, pose: 'frontal', surface: 'dark' });
  return (
    <section className="hero dark">
      <div className="wrap hero__grid">
        <div className="hero__text">
          <div className="eyebrow">TELOINVENTO</div>
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
        <div ref={ref} className="hero__anchor" aria-hidden="true">
          <img
            className="hero__poster"
            src="/posters/logo.webp"
            alt=""
            width={900}
            height={900}
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}
