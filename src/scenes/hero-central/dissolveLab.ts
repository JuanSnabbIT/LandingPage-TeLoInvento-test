import { useSyncExternalStore } from 'react';

/**
 * T12 exploration harness: the dissolve choreography is still an open
 * decision (vault 09-registro-decisiones.md, "Coreografía de scroll de la
 * Capa 2"), so instead of committing to one, every candidate is switchable
 * live from a small dev-only picker (DissolveLabPicker.tsx) and the URL
 * (`?dissolve=dust&pin=1`). The scene reads `mode` every frame; Hero
 * rebuilds its ScrollTrigger when `pin`/`length` change.
 *
 * Once the project owner picks one, the winning branch becomes the only
 * one and this module goes away.
 */
export const DISSOLVE_MODES = [
  { id: 'explode', mode: 0, label: 'Explode (atrás)', hint: 'Original T9: se dispersa detrás del dispositivo.' },
  { id: 'dust', mode: 1, label: 'Polvo (sube)', hint: 'Se erosiona de abajo hacia arriba y flota.' },
  { id: 'burst', mode: 2, label: 'Radial', hint: 'Estalla hacia afuera en el plano de la pantalla.' },
  { id: 'stream', mode: 3, label: 'Fluye (baja)', hint: 'Se derrama hacia abajo y adelante, hacia la sección siguiente.' },
] as const;

export type DissolveModeId = (typeof DISSOLVE_MODES)[number]['id'];

export interface DissolveLabState {
  /** Shader choreography (uMode). */
  mode: number;
  modeId: DissolveModeId;
  /** Pin the Hero while the dissolve plays, or let it scroll away naturally. */
  pin: boolean;
  /** Scroll distance the dissolve spans, as a fraction of viewport height. */
  lengthVh: number;
}

function fromUrl(): DissolveLabState {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const wanted = params?.get('dissolve') ?? 'explode';
  const entry = DISSOLVE_MODES.find((m) => m.id === wanted) ?? DISSOLVE_MODES[0];
  const lengthRaw = Number(params?.get('len') ?? '');
  return {
    mode: entry.mode,
    modeId: entry.id,
    pin: params?.get('pin') === '1',
    lengthVh: Number.isFinite(lengthRaw) && lengthRaw > 0 ? lengthRaw : 80,
  };
}

let state: DissolveLabState = fromUrl();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const dissolveLab = {
  get: () => state,
  set(patch: Partial<DissolveLabState>) {
    let next = { ...state, ...patch };
    if (patch.modeId) {
      const entry = DISSOLVE_MODES.find((m) => m.id === patch.modeId) ?? DISSOLVE_MODES[0];
      next = { ...next, mode: entry.mode, modeId: entry.id };
    }
    state = next;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('dissolve', state.modeId);
      url.searchParams.set('pin', state.pin ? '1' : '0');
      url.searchParams.set('len', String(state.lengthVh));
      window.history.replaceState(null, '', url);
    }
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useDissolveLab(): DissolveLabState {
  return useSyncExternalStore(dissolveLab.subscribe, dissolveLab.get, dissolveLab.get);
}
