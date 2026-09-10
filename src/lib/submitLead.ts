/**
 * T13: single place every form on the page submits through. The REAL
 * destination (email vs. backend) is still an open business decision
 * (vault 09-registro-decisiones.md), so this module is deliberately
 * destination-agnostic and configured purely via env vars -- nothing in
 * the sections needs to change once the decision lands:
 *
 *   VITE_LEAD_ENDPOINT        -> POST JSON `LeadPayload` to this URL
 *                                (Formspree, a serverless fn, the TeLoInvento
 *                                backend -- anything that accepts JSON).
 *   VITE_LEAD_FALLBACK_EMAIL  -> if no endpoint is set, open the visitor's
 *                                mail client with the lead pre-filled.
 *
 * With neither set, dev builds simulate success (payload logged to the
 * console) so the UI flow can be exercised; production builds report a
 * configuration error instead of silently swallowing a real lead.
 */

export type LeadKind = 'contacto' | 'hogar-waitlist';

export interface ContactoLead {
  kind: 'contacto';
  nombre: string;
  correo: string;
  set: string;
  necesidad: string;
  empresa: string;
  tamano: string;
  ubicacion: string;
}

export interface HogarWaitlistLead {
  kind: 'hogar-waitlist';
  correo: string;
}

export type LeadPayload = ContactoLead | HogarWaitlistLead;

export type SubmitResult = { ok: true } | { ok: false; message: string };

const GENERIC_ERROR =
  'No pudimos enviar su solicitud. Intente de nuevo en unos minutos o escríbanos directamente.';

function endpoint(): string | undefined {
  const value = import.meta.env.VITE_LEAD_ENDPOINT;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function fallbackEmail(): string | undefined {
  const value = import.meta.env.VITE_LEAD_FALLBACK_EMAIL;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function toMailto(to: string, lead: LeadPayload): string {
  const subject =
    lead.kind === 'contacto'
      ? `Solicitud de propuesta — ${lead.set}`
      : 'Lista de espera — Set Hogar';
  const lines =
    lead.kind === 'contacto'
      ? [
          `Nombre: ${lead.nombre}`,
          `Correo: ${lead.correo}`,
          `Set de interés: ${lead.set}`,
          `Tamaño de la operación: ${lead.tamano}`,
          `Ubicación: ${lead.ubicacion}`,
          `Empresa: ${lead.empresa || '-'}`,
          '',
          'Necesidad:',
          lead.necesidad,
        ]
      : [`Correo: ${lead.correo}`, '', 'Quiero que me avisen cuando el Set Hogar esté disponible.'];
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

export async function submitLead(lead: LeadPayload): Promise<SubmitResult> {
  const url = endpoint();

  if (url) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...lead, submittedAt: new Date().toISOString(), page: window.location.href }),
      });
      if (!res.ok) return { ok: false, message: GENERIC_ERROR };
      return { ok: true };
    } catch {
      return { ok: false, message: GENERIC_ERROR };
    }
  }

  const to = fallbackEmail();
  if (to) {
    window.location.href = toMailto(to, lead);
    return { ok: true };
  }

  if (import.meta.env.DEV) {
    console.warn('[submitLead] Sin VITE_LEAD_ENDPOINT ni VITE_LEAD_FALLBACK_EMAIL: envío simulado.', lead);
    await new Promise((r) => setTimeout(r, 500));
    return { ok: true };
  }

  return {
    ok: false,
    message: 'El formulario todavía no tiene un destino configurado. Escríbanos directamente mientras tanto.',
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}
