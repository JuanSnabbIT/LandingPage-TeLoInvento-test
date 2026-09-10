import { useState, type FormEvent } from 'react';
import { isValidEmail, submitLead } from '../lib/submitLead';
import './Hogar.css';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/**
 * Ported 1:1 from reference/maqueta-aprobada.html's `<section class="hogar">`.
 * T13: the waitlist email goes through src/lib/submitLead.ts as its own
 * lead kind, so it's registered without going through the main contact
 * form (04-BDD.md, "Set Hogar").
 */
export function Hogar() {
  const [correo, setCorreo] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

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
      <div className="band">
        <div>
          <div className="tag">Próximamente</div>
          <h3>Set Hogar</h3>
          <p>La misma plataforma, pensada para el hogar. Todavía en desarrollo.</p>
        </div>
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
    </section>
  );
}
