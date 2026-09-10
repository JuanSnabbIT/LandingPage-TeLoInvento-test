import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const LOGO_URL = '/models/hero-central/logo-lod1.glb';

/**
 * Loads logo-lod1.glb (the real, already-exported logo mesh -- 22 sub-meshes,
 * ~32k vertices total) and turns its vertices into a flat, centered point
 * cloud used as particle positions.
 *
 * Variant A of docs/architecture/3d-web-standard.md §4: no bake step, no
 * position texture -- the vertex buffer is read directly off the loaded
 * geometry (`useGLTF`) at runtime, per the pipeline decision locked for this
 * spike. `maxParticles` comes from the device-tier heuristic (deviceTier.ts)
 * and subsamples evenly across the source vertices when the budget is lower
 * than the real vertex count.
 */
export function useLogoParticles(maxParticles: number): THREE.BufferGeometry {
  const { scene } = useGLTF(LOGO_URL);

  return useMemo(() => {
    scene.updateWorldMatrix(true, true);

    const collected: number[] = [];
    const vertex = new THREE.Vector3();
    let meshCount = 0;

    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const positionAttribute = child.geometry.getAttribute('position');
      if (!positionAttribute) return;

      meshCount += 1;
      for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute as THREE.BufferAttribute, i);
        vertex.applyMatrix4(child.matrixWorld);
        collected.push(vertex.x, vertex.y, vertex.z);
      }
    });

    const totalVertices = collected.length / 3;

    // "Stop and report rather than silently substituting a primitive" --
    // this should never trigger against the real asset (verified: 22
    // meshes, ~32k vertices), it's a guard against a future swap that
    // strips geometry or ships an empty scene.
    if (meshCount === 0 || totalVertices === 0) {
      throw new Error(
        `[hero-central] logo-lod1.glb produced no usable mesh geometry (meshes: ${meshCount}, vertices: ${totalVertices}) -- refusing to fall back to a placeholder shape.`,
      );
    }

    const stride = Math.max(1, Math.floor(totalVertices / maxParticles));
    const sampled: number[] = [];
    for (let i = 0; i < totalVertices; i += stride) {
      sampled.push(collected[i * 3], collected[i * 3 + 1], collected[i * 3 + 2]);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sampled), 3));
    geometry.computeBoundingBox();

    // Recenter around the local origin so the containing <group> (positioned
    // at the Central's screen-mesh center in HeroCentralScene) can scale
    // and translate this point cloud as a single rigid unit.
    const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      positions.setXYZ(i, positions.getX(i) - center.x, positions.getY(i) - center.y, positions.getZ(i) - center.z);
    }
    positions.needsUpdate = true;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
  }, [scene, maxParticles]);
}
