import './Hogar.css';

/** Ported 1:1 from reference/maqueta-aprobada.html's `<section class="hogar">`. */
export function Hogar() {
  return (
    <section className="hogar">
      <div className="band">
        <div>
          <div className="tag">Próximamente</div>
          <h3>Set Hogar</h3>
          <p>La misma plataforma, pensada para el hogar. Todavía en desarrollo.</p>
        </div>
        <form onSubmit={(event) => event.preventDefault()}>
          <input type="email" placeholder="tu@correo.com" aria-label="Correo para lista de espera" />
          <button type="submit">Avisarme</button>
        </form>
      </div>
    </section>
  );
}
