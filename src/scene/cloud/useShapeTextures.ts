import { useMemo } from 'react';
import { suspend } from 'suspend-react';   // drei ya la trae como dependencia; agregar a package.json: npm i suspend-react
import type * as THREE from 'three';
import { registry } from '../registry';
import { loadShape, loadShapeColor, type Manifest } from './shapeLoader';

export interface ShapeCache {
  get(name: string): THREE.DataTexture | undefined;
  /** Per-particle RGBA8 colour texture, only for shapes baked with `colors` (today: the logo). */
  getColor(name: string): THREE.DataTexture | undefined;
  ensure(name: string): Promise<void>;
  ready(name: string): boolean;
}
const cache = new Map<string, THREE.DataTexture>(); const colorCache = new Map<string, THREE.DataTexture>();
const pending = new Map<string, Promise<void>>();
// Enfriamiento tras un fallo de red: `ensure()` se llama desde `useFrame`, o
// sea hasta 60 veces por segundo. Sin esto, una forma que devuelve 404 dispara
// un fetch por frame (tormenta de pedidos + un rechazo no manejado por frame).
const failedAt = new Map<string, number>();
export const RETRY_COOLDOWN_MS = 5000;
// `console.warn` una sola vez por clave, por el mismo motivo.
const warned = new Set<string>();
const warnOnce = (k: string, ...rest: unknown[]) => {
  if (!import.meta.env.DEV || warned.has(k)) return;
  warned.add(k); console.warn(...rest);
};

const key = (n: string, lod: 'lod2' | 'mobile') => `${n}:${lod}`;

export function isShapeReady(name: string, lod: 'lod2' | 'mobile'): boolean {
  return cache.has(key(name, lod));
}

// Pure helper (no React) so loading/caching/retry can be unit-tested directly.
// Shares the module-level cache/pending maps with useShapeTextures.
export function ensureShape(manifest: Manifest, lod: 'lod2' | 'mobile', name: string, fetchImpl?: typeof fetch): Promise<void> {
  const k = key(name, lod);
  if (cache.has(k)) return Promise.resolve();
  const entry = manifest.shapes[name]?.[lod];
  if (!entry) {
    // Forma ausente del manifiesto (horneado incompleto): se avisa una vez y
    // se resuelve. Tirar acá reventaría dentro de `useFrame`, que es donde
    // vive el llamador.
    warnOnce(k, '[scene] shape missing from the manifest, skipping:', k);
    return Promise.resolve();
  }
  const failed = failedAt.get(k);
  if (failed !== undefined && Date.now() - failed < RETRY_COOLDOWN_MS) return Promise.resolve();
  let p = pending.get(k);
  if (!p) {
    p = Promise.all([loadShape(entry, fetchImpl), loadShapeColor(entry, fetchImpl)])
      .then(([t, c]) => {
        cache.set(k, t); if (c) colorCache.set(k, c);
        pending.delete(k); failedAt.delete(k);
        // Fuente dirty: la forma recién cargada cambia lo que se dibuja.
        registry.markDirty();
      })
      .catch((err) => {
        // Clear the pending entry so a rejected load doesn't stick forever —
        // the next ensure() after the cooldown re-fetches instead of returning
        // the same rejection.
        pending.delete(k);
        failedAt.set(k, Date.now());
        warnOnce(k, '[scene] shape load failed, will retry after the cooldown:', k, err);
        throw err;
      });
    pending.set(k, p);
  }
  return p;
}

export function useShapeTextures(manifest: Manifest, lod: 'lod2' | 'mobile', initialNames: string[]): ShapeCache {
  const ensure = (n: string) => ensureShape(manifest, lod, n);
  // Suspende solo la carga inicial (formas del tramo 0)
  suspend(() => Promise.all(initialNames.map(ensure)), ['shapes-initial', lod, ...initialNames]);
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- `ensure` cierra sobre `manifest`, que se carga una sola vez por sesión; recrear el cache en cada render invalidaría el `ready()` que consulta `useFrame`
  return useMemo(() => ({ get: (n) => cache.get(key(n, lod)), getColor: (n) => colorCache.get(key(n, lod)), ensure, ready: (n) => isShapeReady(n, lod) }), [lod]);
}
