export type TramoKind = 'viaje' | 'morphEnSitio' | 'apagado';
export interface Tramo { from: { shape: string; slot: string }; to: { shape: string; slot: string } | null; kind: TramoKind; trigger: { start: [string, string]; end: [string, string] } }
export const TRAMOS: Tramo[] = [
  { from: { shape: 'logo', slot: 'hero-display' }, to: { shape: 'nodo', slot: 'problema' }, kind: 'viaje', trigger: { start: ['hero', 'bottom bottom'], end: ['problema', 'center center'] } },
  { from: { shape: 'nodo', slot: 'problema' }, to: { shape: 'set', slot: 'solucion' }, kind: 'viaje', trigger: { start: ['problema', 'center center'], end: ['solucion', 'center center'] } },
  { from: { shape: 'set', slot: 'solucion' }, to: { shape: 'capacidades', slot: 'capacidades' }, kind: 'viaje', trigger: { start: ['solucion', 'center center'], end: ['capacidades', 'center center'] } },
  { from: { shape: 'capacidades', slot: 'capacidades' }, to: { shape: 'wifi', slot: 'valor' }, kind: 'viaje', trigger: { start: ['capacidades', 'center center'], end: ['valor', 'center center'] } },
  { from: { shape: 'wifi', slot: 'valor' }, to: { shape: 'nodo-explotado', slot: 'proceso' }, kind: 'viaje', trigger: { start: ['valor', 'center center'], end: ['proceso', 'center 65%'] } },
  { from: { shape: 'nodo-explotado', slot: 'proceso' }, to: { shape: 'nodo', slot: 'proceso' }, kind: 'morphEnSitio', trigger: { start: ['proceso', 'center 65%'], end: ['proceso', 'center 45%'] } },
  { from: { shape: 'nodo', slot: 'proceso' }, to: null, kind: 'apagado', trigger: { start: ['proceso', 'center 45%'], end: ['contacto', 'top 60%'] } },
];
export interface Resolved { a: string; b: string; slotA: string; slotB: string; t: number; alpha: number; kind: TramoKind; index: number; crossfade: boolean }
const smooth = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };
export function quantize(p: number, prev: number, h: number): number { return prev < 0.5 ? (p > 0.5 + h ? 1 : 0) : (p < 0.5 - h ? 0 : 1); }
export function resolveTramo(progress: (i: number) => number, tramos: Tramo[], o: { reposoCola: number; reposoCabeza: number; reduced: boolean }): Resolved {
  let index = 0; for (let i = tramos.length - 1; i >= 0; i--) { if (progress(i) > 0) { index = i; break; } }
  const tr = tramos[index]; const q = Math.min(1, Math.max(0, progress(index)));
  const a = tr.from.shape, slotA = tr.from.slot, b = tr.to?.shape ?? tr.from.shape, slotB = tr.to?.slot ?? tr.from.slot;
  let t: number; let alpha = 1;
  if (o.reduced) { t = q >= 0.5 ? 1 : 0; }
  else if (tr.kind === 'viaje') {
    const span = 1 - o.reposoCola - o.reposoCabeza;
    t = q <= o.reposoCola ? 0 : q >= 1 - o.reposoCabeza ? 1 : smooth((q - o.reposoCola) / span);
  } else { t = smooth(q); }
  if (tr.kind === 'apagado') alpha = 1 - t;
  return { a, b, slotA, slotB, t, alpha, kind: tr.kind, index, crossfade: o.reduced };
}
