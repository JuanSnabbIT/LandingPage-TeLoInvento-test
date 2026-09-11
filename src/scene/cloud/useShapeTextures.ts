import { useMemo } from 'react';
import { suspend } from 'suspend-react';   // drei ya la trae como dependencia; agregar a package.json: npm i suspend-react
import type * as THREE from 'three';
import { loadShape, type Manifest } from './shapeLoader';

export interface ShapeCache { get(name: string): THREE.DataTexture | undefined; ensure(name: string): Promise<void>; ready(name: string): boolean; }
const cache = new Map<string, THREE.DataTexture>(); const pending = new Map<string, Promise<void>>();

const key = (n: string, lod: 'lod2' | 'mobile') => `${n}:${lod}`;

export function isShapeReady(name: string, lod: 'lod2' | 'mobile'): boolean {
  return cache.has(key(name, lod));
}

// Pure helper (no React) so loading/caching/retry can be unit-tested directly.
// Shares the module-level cache/pending maps with useShapeTextures.
export function ensureShape(manifest: Manifest, lod: 'lod2' | 'mobile', name: string, fetchImpl?: typeof fetch): Promise<void> {
  const k = key(name, lod);
  if (cache.has(k)) return Promise.resolve();
  let p = pending.get(k);
  if (!p) {
    p = loadShape(manifest.shapes[name][lod], fetchImpl)
      .then((t) => { cache.set(k, t); pending.delete(k); })
      .catch((err) => {
        // Clear the pending entry so a rejected load doesn't stick forever —
        // the next ensure() re-fetches instead of returning the same rejection.
        pending.delete(k);
        if (import.meta.env.DEV) console.warn('[scene] shape load failed, will retry on next ensure:', k, err);
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
  return useMemo(() => ({ get: (n) => cache.get(key(n, lod)), ensure, ready: (n) => isShapeReady(n, lod) }), [lod]);
}
