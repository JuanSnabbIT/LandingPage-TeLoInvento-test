import * as THREE from 'three';
export interface ShapeEntry { file: string; size: number; count: number; bbox: { min: number[]; max: number[] } }
export interface Manifest { shapes: Record<string, Record<'lod2' | 'mobile', ShapeEntry>>; sequence: string[]; tiers: Record<'high' | 'medium' | 'low', 'lod2' | 'mobile'> }

export function bufferToTexture(buf: ArrayBuffer, size: number): THREE.DataTexture {
  const tex = new THREE.DataTexture(new Uint16Array(buf), size, size, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.flipY = false;
  tex.needsUpdate = true; return tex;
}
export async function loadManifest(url = '/scene-manifest.json'): Promise<Manifest> {
  const r = await fetch(url); if (!r.ok) throw new Error(`[scene] manifest ${r.status}`); return r.json();
}
export async function loadShape(entry: ShapeEntry, fetchImpl: typeof fetch = fetch): Promise<THREE.DataTexture> {
  const r = await fetchImpl(entry.file); if (!r.ok) throw new Error(`[scene] shape ${entry.file} ${r.status}`);
  const buf = await r.arrayBuffer();
  if (buf.byteLength !== entry.size * entry.size * 8) throw new Error(`[scene] shape ${entry.file}: unexpected size ${buf.byteLength}`);
  performance.mark(`shape:${entry.file}`);
  return bufferToTexture(buf, entry.size);
}
