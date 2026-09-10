import './Contacto.css';

/**
 * Ported 1:1 from reference/maqueta-aprobada.html's `<section class="contacto" id="contacto">`.
 * Form has no real destination yet (email vs. backend) -- deliberately deferred,
 * see vault 09-registro-decisiones.md. Submit is a no-op for now, same as the maqueta.
 */
export function Contacto() {
  return (
    <section className="contacto" id="contacto">
      <div className="wrap grid">
        <div>
          <div className="eyebrow">CONTACTO</div>
          <h2>Solicite una propuesta a medida</h2>
          <p className="lead">
            Cuéntenos qué necesita y le respondemos con una propuesta concreta para su operación.
          </p>
        </div>
        <form onSubmit={(event) => event.preventDefault()}>
          <div className="form-grid">
            <div>
              <label htmlFor="f-nombre">Nombre</label>
              <input id="f-nombre" type="text" placeholder="Su nombre" />
            </div>
            <div>
              <label htmlFor="f-correo">Correo electrónico</label>
              <input id="f-correo" type="email" placeholder="usted@correo.com" />
            </div>
            <div className="full">
              <label htmlFor="f-set">¿Qué set le interesa?</label>
              <select id="f-set" defaultValue="Riego">
                <option>Riego</option>
                <option>Seguridad perimetral</option>
                <option>Ambos</option>
                <option>Hogar (lista de espera)</option>
                <option>Otro</option>
              </select>
            </div>
            <div className="full">
              <label htmlFor="f-necesidad">Cuéntenos su necesidad</label>
              <textarea id="f-necesidad" placeholder="¿Qué quiere resolver?" />
            </div>
            <div>
              <label htmlFor="f-empresa">Empresa (opcional)</label>
              <input id="f-empresa" type="text" placeholder="Nombre de la empresa" />
            </div>
            <div>
              <label htmlFor="f-tamano">Tamaño aproximado de su operación</label>
              <select id="f-tamano" defaultValue="Pequeña">
                <option>Pequeña</option>
                <option>Mediana</option>
                <option>Grande</option>
              </select>
            </div>
            <div className="full">
              <label htmlFor="f-ubicacion">Ubicación</label>
              <input id="f-ubicacion" type="text" placeholder="Comuna / ciudad" />
            </div>
          </div>
          <button
            className="btn primary"
            type="submit"
            style={{ border: 'none', cursor: 'pointer', marginTop: '18px' }}
          >
            Solicitar propuesta
          </button>
          <p className="fine">
            Sus datos se tratan con confidencialidad. Respondemos en menos de 24 horas.
          </p>
        </form>
      </div>
    </section>
  );
}
