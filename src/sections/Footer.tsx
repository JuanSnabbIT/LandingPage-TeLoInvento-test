import './Footer.css';

/** Ported 1:1 from reference/maqueta-aprobada.html's `<footer>`. */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <a className="word" href="#" style={{ color: 'var(--dark-ink)', marginBottom: '8px', display: 'inline-flex' }}>
            <span className="dot" />
            TeLoInvento
          </a>
        </div>
        <div>
          <h5>Producto</h5>
          <ul>
            <li>
              <a href="#solucion">Solución</a>
            </li>
            <li>
              <a href="#capacidades">Capacidades</a>
            </li>
            <li>
              <a href="#valor">Valor de negocio</a>
            </li>
            <li>
              <a href="#proceso">Cómo trabajamos</a>
            </li>
          </ul>
        </div>
        <div>
          <h5>Recursos</h5>
          <ul>
            <li>
              <a className="blog" href="#" target="_blank" rel="noopener">
                Blog de soporte técnico
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h5>Contacto</h5>
          <ul>
            <li>
              <a href="#contacto">Contacto</a>
            </li>
          </ul>
        </div>
        <div className="footer-cta">
          <h5>Solicite una propuesta a medida</h5>
          <p>Le ayudamos a elegir el set que su operación necesita.</p>
          <a className="btn primary" href="#contacto">
            Contacto
          </a>
        </div>
      </div>
      <div className="footer-bottom">© 2026 TeLoInvento. Todos los derechos reservados.</div>
    </footer>
  );
}
