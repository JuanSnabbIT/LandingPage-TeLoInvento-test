import './Header.css';

/** Ported 1:1 from reference/maqueta-aprobada.html's <header>. */
export function Header() {
  return (
    <header className="site-header">
      <a className="word" href="#">
        <span className="dot" />
        TeLoInvento
      </a>
      <nav className="main">
        <a href="#solucion">Solución</a>
        <a href="#capacidades">Capacidades</a>
        <a href="#valor">Valor de negocio</a>
        <a href="#proceso">Cómo trabajamos</a>
      </nav>
      <a className="btn primary" href="#contacto">
        Solicitar propuesta
      </a>
    </header>
  );
}
