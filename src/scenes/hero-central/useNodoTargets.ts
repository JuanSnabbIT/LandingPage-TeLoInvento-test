import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const NODO_URL = '/models/seccion-1/nodo.glb';
useGLTF.preload(NODO_URL);

export interface NodoTargets {
  /** `count * 3` positions on the Nodo's surface, centered on its bounding-box center, in the GLB's own units (meters). */
  positions: Float32Array;
  /** Largest bounding-box dimension, same units -- used to fit the cloud into its DOM anchor. */
  maxDim: number;
}

/**
 * Capa 2 target shape: the Nodo (public/models/seccion-1/nodo.glb, ~2k
 * vertices across 8 meshes). Too few raw vertices for a dense cloud, so
 * instead of reading vertices (as useLogoParticles does for the logo) we
 * sample `count` points uniformly over the merged surface -- one target
 * per logo particle, so the shader can lerp particle i from its dissolved
 * position straight onto target i (see particle.vert.ts, phase B).
 *
 * Deterministic: the sampler is seeded through a fixed-sequence PRNG so
 * the cloud looks identical on every load.
 */
export function useNodoTargets(count: number): NodoTargets {
  const { scene } = useGLTF(NODO_URL);

  return useMemo(() => {
    scene.updateWorldMatrix(true, true);

    const parts: THREE.BufferGeometry[] = [];
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      let g = (child.geometry as THREE.BufferGeometry).clone();
      // Position only -- mergeGeometries needs identical attribute sets,
      // and the sampler only needs positions (no normals/uvs required).
      for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name);
      g.morphAttributes = {};
      g = g.toNonIndexed();
      g.applyMatrix4(child.matrixWorld);
      parts.push(g);
    });

    if (parts.length === 0) {
      throw new Error('[hero-central] nodo.glb produced no mesh geometry -- refusing to fall back to a placeholder shape.');
    }

    const merged = mergeGeometries(parts, false);
    if (!merged) throw new Error('[hero-central] nodo.glb geometries could not be merged.');
    merged.computeBoundingBox();
    const center = merged.boundingBox!.getCenter(new THREE.Vector3());
    const size = merged.boundingBox!.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Fixed-sequence PRNG (mulberry32) so sampling is reproducible.
    let seed = 0x9e3779b9;
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const sampler = new MeshSurfaceSampler(new THREE.Mesh(merged));
    // Runtime supports setRandomGenerator(); @types/three doesn't declare it yet -- set the field directly.
    (sampler as unknown as { randomFunction: () => number }).randomFunction = random;
    sampler.build();
    const positions = new Float32Array(count * 3);
    const p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      sampler.sample(p);
      positions[i * 3] = p.x - center.x;
      positions[i * 3 + 1] = p.y - center.y;
      positions[i * 3 + 2] = p.z - center.z;
    }

    for (const g of parts) g.dispose();
    merged.dispose();

    return { positions, maxDim };
  }, [scene, count]);
}
