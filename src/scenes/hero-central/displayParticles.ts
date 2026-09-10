import * as THREE from 'three';

interface BuildDisplayParticlesArgs {
  /** Centered, raw logo units (see useLogoParticles.ts) -- unscaled. */
  logoGeometry: THREE.BufferGeometry;
  /** Fit factor that maps raw logo units onto the display's real size. */
  fitScale: number;
  /** `count * 3` Capa-2 target positions (the Nodo surface, centered, its own units) -- see useNodoTargets.ts. */
  targetPositions: Float32Array;
}

// Deterministic GLSL-style hash, ported to JS -- same output every time for
// the same (index, salt) pair, so per-particle seeds are fixed at setup and
// never recomputed per frame (no Math.random(), no per-frame work).
function hash(index: number, salt: number): number {
  const s = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Builds the render geometry for the logo particles: `position` holds each
 * particle's FLAT resting position -- on the display plane, in
 * DisplayAnchor-local space, z=0; `aSeed` a fixed per-particle random in
 * [0,1) for stagger/drift; `targetPosition` where particle i lands after
 * the Capa-2 travel (a point on the Nodo, its own centered units -- see
 * useNodoTargets.ts). All computed once, here; the vertex shader
 * (particle.vert.ts) only blends between fixed inputs via `uProgress`.
 */
export function buildDisplayParticleGeometry({
  logoGeometry,
  fitScale,
  targetPositions,
}: BuildDisplayParticlesArgs): THREE.BufferGeometry {
  const rawPositions = logoGeometry.getAttribute('position') as THREE.BufferAttribute;
  const count = rawPositions.count;

  const flat = new Float32Array(count * 3);
  // Per-particle deterministic seed in [0,1) -- used by the dissolve
  // variants (particle.vert.ts) to stagger when each particle starts to
  // leave and to give it its own drift. Computed once, never per frame.
  const seed = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const x = rawPositions.getX(i) * fitScale;
    const y = rawPositions.getY(i) * fitScale;

    flat[i * 3] = x;
    flat[i * 3 + 1] = y;
    flat[i * 3 + 2] = 0;

    seed[i] = hash(i, 4.0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(flat, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  // Where particle i ends up after the Capa-2 travel: a point on the Nodo,
  // in the Nodo's OWN centered units. The shader maps it into this
  // geometry's local space every frame through uTargetMatrix, so the
  // destination can sit at a different DOM anchor, scale and rotation.
  geometry.setAttribute('targetPosition', new THREE.BufferAttribute(targetPositions.slice(0, count * 3), 3));
  geometry.computeBoundingSphere();

  return geometry;
}
