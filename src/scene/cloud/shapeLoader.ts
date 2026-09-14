import * as THREE from 'three';
export interface ShapeEntry { file: string; size: number; count: number; bbox: { min: number[]; max: number[] }; params?: string; hasColor?: boolean; links?: string; linkCount?: number }
export interface LoadedShape { positions: THREE.DataTexture; color?: THREE.DataTexture }
export interface Manifest { shapes: Record<string, Record<'lod2' | 'mobile', ShapeEntry>>; sequence: string[]; tiers: Record<'high' | 'medium' | 'low', 'lod2' | 'mobile'> }

export function bufferToTexture(buf: ArrayBuffer, size: number): THREE.DataTexture {
  const tex = new THREE.DataTexture(new Uint16Array(buf), size, size, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.flipY = false;
  tex.needsUpdate = true; return tex;
}
export async function loadManifest(url = '/scene-manifest.json'): Promise<Manifest> {
  const r = await fetch(url); if (!r.ok) throw new Error(`[scene] manifest ${r.status}`); return r.json();
}
/** RGBA8 per-particle colour (same pixel index as the positions). */
export function bufferToParamsTexture(buf: ArrayBuffer, size: number): THREE.DataTexture {
  const tex = new THREE.DataTexture(new Uint8Array(buf), size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true; return tex;
}
export async function loadShape(entry: ShapeEntry, fetchImpl: typeof fetch = fetch): Promise<THREE.DataTexture> {
  const r = await fetchImpl(entry.file); if (!r.ok) throw new Error(`[scene] shape ${entry.file} ${r.status}`);
  const buf = await r.arrayBuffer();
  if (buf.byteLength !== entry.size * entry.size * 8) throw new Error(`[scene] shape ${entry.file}: unexpected size ${buf.byteLength}`);
  performance.mark(`shape:${entry.file}`);
  return bufferToTexture(buf, entry.size);
}
export async function loadShapeParams(entry: ShapeEntry, fetchImpl: typeof fetch = fetch): Promise<THREE.DataTexture | undefined> {
  if (!entry.params) return undefined;
  const r = await fetchImpl(entry.params); if (!r.ok) throw new Error(`[scene] shape colour ${entry.params} ${r.status}`);
  const buf = await r.arrayBuffer();
  if (buf.byteLength !== entry.size * entry.size * 4) throw new Error(`[scene] shape colour ${entry.params}: unexpected size ${buf.byteLength}`);
  return bufferToParamsTexture(buf, entry.size);
}

export async function loadShapeLinks(entry: ShapeEntry, fetchImpl: typeof fetch = fetch): Promise<Float32Array | undefined> {
  if (!entry.links) return undefined;
  const r = await fetchImpl(entry.links);
  if (!r.ok) throw new Error(`[scene] links ${entry.links}: ${r.status}`);
  const buf = await r.arrayBuffer();
  if (buf.byteLength !== (entry.linkCount ?? 0) * 8) throw new Error('[scene] invalid link buffer length');
  const ids = new Uint32Array(buf);
  if (ids.some(id => id >= entry.count)) throw new Error('[scene] link index outside particle range');
  return Float32Array.from(ids);
}
