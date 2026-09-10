import * as THREE from 'three';

interface BuildDisplayParticlesArgs {
  /** Centered, raw logo units (see useLogoParticles.ts) -- unscaled. */
  logoGeometry: THREE.BufferGeometry;
  /** Fit factor that maps raw logo units onto the display's real size. */
  fitScale: number;
  /** The display's own width/height/depth (DisplayAnchor-local units). */
  screenSize: THREE.Vector3;
  /** The Device's overall largest dimension -- used to scale the "explode" depth sensibly. */
  maxDim: number;
  /** `count * 3` Capa-2 target positions (the Nodo surface, centered, its own units) -- see useNodoTargets.ts. */
  targetPositions: Float32Array;
}

// Deterministic GLSL-style hash, ported to JS -- same output every time for
// the same (index, salt) pair, so the exploded dispersion is fixed at setup
// and never recomputed per frame (no Math.random(), no per-frame work).
function hash(index: number, salt: number): number {
  const s = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Builds the render geometry for the logo particles per the mouse-parallax
 * + scroll-explode follow-up's required setup: `position` holds each
 * particle's FLAT resting position -- on the display plane, in
 * DisplayAnchor-local space, z=0 -- and the custom `explodedPosition`
 * attribute holds where that same particle goes once fully dispersed
 * behind the device, ALSO in DisplayAnchor-local space (its local -Z is
 * "back," by construction of the anchor's orientation -- see
 * HeroCentralScene.tsx for how that axis is derived from the Device's
 * real geometry, not a hardcoded world axis).
 *
 * Both attributes are computed once, here, at setup time. The vertex
 * shader (particle.vert.ts) only ever mixes between them via `uProgress`
 * -- it never recomputes either position itself.
 */
export function buildDisplayParticleGeometry({
  logoGeometry,
  fitScale,
  screenSize,
  maxDim,
  targetPositions,
}: BuildDisplayParticlesArgs): THREE.BufferGeometry {
  const rawPositions = logoGeometry.getAttribute('position') as THREE.BufferAttribute;
  const count = rawPositions.count;

  const flat = new Float32Array(count * 3);
  const exploded = new Float32Array(count * 3);
  // Per-particle deterministic seed in [0,1) -- used by the dissolve
  // variants (particle.vert.ts) to stagger when each particle starts to
  // leave and to give it its own drift. Computed once, never per frame.
  const seed = new Float32Array(count);

  // Dispersion budget: lateral/vertical spread relative to the display's
  // own size, depth relative to the Device's own overall size -- so the
  // cloud disperses behind the *actual* device, not by a fixed world
  // distance that would look wrong on a different LOD/asset.
  const lateralSpread = screenSize.x * 0.9;
  const verticalSpread = screenSize.y * 0.9;
  const baseDepth = maxDim * 0.9;
  const depthVariance = maxDim * 0.6;

  for (let i = 0; i < count; i++) {
    const x = rawPositions.getX(i) * fitScale;
    const y = rawPositions.getY(i) * fitScale;

    flat[i * 3] = x;
    flat[i * 3 + 1] = y;
    flat[i * 3 + 2] = 0;

    const lateralOffset = (hash(i, 1.0) - 0.5) * lateralSpread;
    const verticalOffset = (hash(i, 2.0) - 0.5) * verticalSpread;
    const depth = baseDepth + hash(i, 3.0) * depthVariance;

    exploded[i * 3] = x + lateralOffset;
    exploded[i * 3 + 1] = y + verticalOffset;
    exploded[i * 3 + 2] = -depth;

    seed[i] = hash(i, 4.0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(flat, 3));
  geometry.setAttribute('explodedPosition', new THREE.BufferAttribute(exploded, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  // Where particle i ends up after the Capa-2 travel: a point on the Nodo,
  // in the Nodo's OWN centered units. The shader maps it into this
  // geometry's local space every frame through uTargetMatrix, so the
  // destination can sit at a different DOM anchor, scale and rotation.
  geometry.setAttribute('targetPosition', new THREE.BufferAttribute(targetPositions.slice(0, count * 3), 3));
  geometry.computeBoundingSphere();

  return geometry;
}
