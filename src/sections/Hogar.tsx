import { useRef, useState, type FormEvent } from 'react';
import { isValidEmail, submitLead } from '../lib/submitLead';
import { useSceneSlot } from '../scene/useSceneSlot';
import './Hogar.css';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/**
 * Rediseño 2026-09-14: pasa de franja angosta a sección propia con su caja
 * de escena (T20/T21) -- ver `assets-source/models/hogar/README.md` para el
 * modelo placeholder. La lista de espera se mantiene igual: T13, el correo
 * va por src/lib/submitLead.ts como su propio tipo de lead, sin pasar por
 * el formulario principal de contacto (04-BDD.md, "Set Hogar").
 */
export function Hogar() {
  const [correo, setCorreo] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useSceneSlot({ id: 'hogar', anchorRef: ref, fit: 1.1, pose: 'tresCuartos', surface: 'light' });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidEmail(correo)) {
      setStatus('error');
      setMessage('Ingrese un correo válido.');
      return;
    }
    setStatus('sending');
    const result = await submitLead({ kind: 'hogar-waitlist', correo: correo.trim() });
    if (result.ok) {
      setStatus('sent');
      setMessage('Listo. Le avisamos cuando el Set Hogar esté disponible.');
    } else {
      setStatus('error');
      setMessage(result.message);
    }
  };

  return (
    <section className="hogar">
      <div className="wrap grid">
        <div>
          <div className="tag">Próximamente</div>
          <h2>Set Hogar</h2>
          <p className="lead">La misma plataforma, pensada para el hogar. Todavía en desarrollo.</p>
          {status === 'sent' ? (
            <p className="hogar__status hogar__status--ok" role="status" aria-live="polite">
              {message}
            </p>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <div className="hogar__row">
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  aria-label="Correo para lista de espera"
                  aria-invalid={status === 'error' ? true : undefined}
                  value={correo}
                  onChange={(e) => {
                    setCorreo(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                />
                <button type="submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Enviando…' : 'Avisarme'}
                </button>
              </div>
              {status === 'error' && (
                <p className="hogar__status hogar__status--error" role="alert">
                  {message}
                </p>
              )}
            </form>
          )}
        </div>
        <div ref={ref} className="visual">
          <span className="scene-caption">El mismo lenguaje, pensado para el hogar</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M4 11.5 12 4l8 7.5M6 10v9h12v-9" />
          </svg>
        </div>
      </div>
    </section>
  );
}
