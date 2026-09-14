import { useRef, useState, type FormEvent } from 'react';
import { isValidEmail, submitLead, type ContactoLead } from '../lib/submitLead';
import { useSceneSlot } from '../scene/useSceneSlot';
import './Contacto.css';

type Values = Omit<ContactoLead, 'kind'>;
type Field = keyof Values;
type Errors = Partial<Record<Field, string>>;
type Status = 'idle' | 'sending' | 'sent' | 'error';

const SET_OPTIONS = ['Riego', 'Seguridad perimetral', 'Ambos', 'Hogar (lista de espera)', 'Otro'];
const TAMANO_OPTIONS = ['Pequeña', 'Mediana', 'Grande'];

const INITIAL: Values = {
  nombre: '',
  correo: '',
  set: SET_OPTIONS[0],
  necesidad: '',
  empresa: '',
  tamano: TAMANO_OPTIONS[0],
  ubicacion: '',
};

/**
 * Validation per 04-BDD.md "Validación de campos": the visitor sees which
 * required fields are missing without losing what's already filled in.
 * `empresa` is the only optional field (labelled as such).
 */
function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.nombre.trim()) e.nombre = 'Ingrese su nombre.';
  if (!v.correo.trim()) e.correo = 'Ingrese su correo electrónico.';
  else if (!isValidEmail(v.correo)) e.correo = 'Revise el formato del correo.';
  if (!v.necesidad.trim()) e.necesidad = 'Cuéntenos brevemente qué quiere resolver.';
  if (!v.ubicacion.trim()) e.ubicacion = 'Indique su comuna o ciudad.';
  return e;
}

/**
 * Ported from reference/maqueta-aprobada.html's `<section class="contacto" id="contacto">`
 * (markup/field set unchanged). T13 adds: controlled fields, required-field
 * validation with inline messages, sending/sent/error states, and a real
 * submit through src/lib/submitLead.ts -- whose destination is env-driven,
 * since email-vs-backend is still an open business decision (vault
 * 09-registro-decisiones.md).
 */
export function Contacto() {
  const [values, setValues] = useState<Values>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  // Plataforma Central se mudó acá desde Capacidades (rediseño 2026-09-14):
  // llena el espacio que quedaba vacío bajo el texto de introducción.
  const microchipRef = useRef<HTMLDivElement>(null);
  useSceneSlot({ id: 'contacto-microchip', anchorRef: microchipRef, fit: 0.95, pose: 'tresCuartos', surface: 'light' });

  const update = (field: Field, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    const firstInvalid = (Object.keys(nextErrors) as Field[])[0];
    if (firstInvalid) {
      document.getElementById(`f-${firstInvalid}`)?.focus();
      return;
    }

    setStatus('sending');
    const result = await submitLead({ kind: 'contacto', ...values });
    if (result.ok) {
      setStatus('sent');
    } else {
      setStatus('error');
      setErrorMessage(result.message);
    }
  };

  const fieldProps = (field: Field) => ({
    id: `f-${field}`,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `f-${field}-error` : undefined,
  });

  const errorFor = (field: Field) =>
    errors[field] ? (
      <p className="field-error" id={`f-${field}-error`} role="alert">
        {errors[field]}
      </p>
    ) : null;

  return (
    <section className="contacto" id="contacto">
      <div className="wrap grid">
        {/* `contacto__intro` está en la lista SKIP de useSectionReveals: contiene la caja de escena del chip. */}
        <div className="contacto__intro">
          <div className="eyebrow">CONTACTO</div>
          <h2>Solicite una propuesta a medida</h2>
          <p className="lead">
            Cuéntenos qué necesita y le respondemos con una propuesta concreta para su operación.
          </p>
          <div ref={microchipRef} className="visual">
            <span className="scene-caption">Una Central con pantalla, la web y la app</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="4" y="4" width="7" height="7" rx="1.2" />
              <rect x="13" y="4" width="7" height="7" rx="1.2" />
              <rect x="4" y="13" width="7" height="7" rx="1.2" />
              <rect x="13" y="13" width="7" height="7" rx="1.2" />
            </svg>
          </div>
        </div>

        {status === 'sent' ? (
          <div className="form-success" role="status" aria-live="polite">
            <div className="form-success__check" aria-hidden="true">
              ✓
            </div>
            <h3>Solicitud recibida</h3>
            <p>
              Gracias, {values.nombre.trim()}. Le respondemos a <strong>{values.correo.trim()}</strong> en
              menos de 24 horas con una propuesta para su operación.
            </p>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setValues(INITIAL);
                setErrors({});
                setStatus('idle');
              }}
            >
              Enviar otra solicitud
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div className="form-grid">
              <div>
                <label htmlFor="f-nombre">Nombre</label>
                <input
                  {...fieldProps('nombre')}
                  type="text"
                  autoComplete="name"
                  placeholder="Su nombre"
                  value={values.nombre}
                  onChange={(e) => update('nombre', e.target.value)}
                />
                {errorFor('nombre')}
              </div>
              <div>
                <label htmlFor="f-correo">Correo electrónico</label>
                <input
                  {...fieldProps('correo')}
                  type="email"
                  autoComplete="email"
                  placeholder="usted@correo.com"
                  value={values.correo}
                  onChange={(e) => update('correo', e.target.value)}
                />
                {errorFor('correo')}
              </div>
              <div className="full">
                <label htmlFor="f-set">¿Qué set le interesa?</label>
                <select {...fieldProps('set')} value={values.set} onChange={(e) => update('set', e.target.value)}>
                  {SET_OPTIONS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div className="full">
                <label htmlFor="f-necesidad">Cuéntenos su necesidad</label>
                <textarea
                  {...fieldProps('necesidad')}
                  placeholder="¿Qué quiere resolver?"
                  value={values.necesidad}
                  onChange={(e) => update('necesidad', e.target.value)}
                />
                {errorFor('necesidad')}
              </div>
              <div>
                <label htmlFor="f-empresa">Empresa (opcional)</label>
                <input
                  {...fieldProps('empresa')}
                  type="text"
                  autoComplete="organization"
                  placeholder="Nombre de la empresa"
                  value={values.empresa}
                  onChange={(e) => update('empresa', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="f-tamano">Tamaño aproximado de su operación</label>
                <select
                  {...fieldProps('tamano')}
                  value={values.tamano}
                  onChange={(e) => update('tamano', e.target.value)}
                >
                  {TAMANO_OPTIONS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div className="full">
                <label htmlFor="f-ubicacion">Ubicación</label>
                <input
                  {...fieldProps('ubicacion')}
                  type="text"
                  autoComplete="address-level2"
                  placeholder="Comuna / ciudad"
                  value={values.ubicacion}
                  onChange={(e) => update('ubicacion', e.target.value)}
                />
                {errorFor('ubicacion')}
              </div>
            </div>

            <button className="btn primary submit" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Enviando…' : 'Solicitar propuesta'}
            </button>

            {status === 'error' && (
              <p className="form-error" role="alert">
                {errorMessage}
              </p>
            )}

            <p className="fine">Sus datos se tratan con confidencialidad. Respondemos en menos de 24 horas.</p>
          </form>
        )}
      </div>
    </section>
  );
}
