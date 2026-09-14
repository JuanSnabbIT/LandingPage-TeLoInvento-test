import { useState, type FormEvent } from 'react';
import { isValidEmail, submitLead } from '../lib/submitLead';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/**
 * Lista de espera del Set Hogar (T13): su propio tipo de lead, sin pasar por
 * el formulario principal de contacto (04-BDD.md, "Set Hogar"). Vive en la
 * tercera tarjeta del carrusel de Capacidades desde que la sección Hogar
 * dejó de existir (2026-09-14).
 */
export function HogarWaitlist() {
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

  if (status === 'sent') {
    return (
      <p className="hogar-waitlist__status hogar-waitlist__status--ok" role="status" aria-live="polite">
        {message}
      </p>
    );
  }
  return (
    <form className="hogar-waitlist" onSubmit={onSubmit} noValidate>
      <div className="hogar-waitlist__row">
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
        <p className="hogar-waitlist__status hogar-waitlist__status--error" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
