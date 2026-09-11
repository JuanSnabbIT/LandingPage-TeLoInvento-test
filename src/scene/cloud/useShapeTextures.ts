import { useMemo } from 'react';
import { suspend } from 'suspend-react';   // drei ya la trae como dependencia; agregar a package.json: npm i suspend-react
import type * as THREE from 'three';
import { loadShape, type Manifest } from './shapeLoader';

export interface ShapeCache { get(name: string): THREE.DataTexture | undefined; ensure(name: string): Promise<void>; ready(name: string): boolean; }
const cache = new Map<string, THREE.DataTexture>(); const pending = new Map<string, Promise<void>>();

export function useShapeTextures(manifest: Manifest, lod: 'lod2' | 'mobile', initialNames: string[]): ShapeCache {
  const key = (n: string) => `${n}:${lod}`;
  const ensure = (n: string) => {
    const k = key(n); if (cache.has(k)) return Promise.resolve();
    let p = pending.get(k);
    if (!p) { p = loadShape(manifest.shapes[n][lod]).then((t) => { cache.set(k, t); pending.delete(k); }); pending.set(k, p); }
    return p;
  };
  // Suspende solo la carga inicial (formas del tramo 0)
  suspend(() => Promise.all(initialNames.map(ensure)), ['shapes-initial', lod, ...initialNames]);
  return useMemo(() => ({ get: (n) => cache.get(key(n)), ensure, ready: (n) => cache.has(key(n)) }), [lod]);
}
