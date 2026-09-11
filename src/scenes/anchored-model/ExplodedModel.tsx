import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useAnchoredGroup } from './useAnchoredGroup';

export interface ExplodedModelSpec {
  /** GLB under public/ whose named meshes get pulled apart. */
  url: string;
  /** DOM box the model is fitted into and follows on scroll. */
  anchorRef: RefObject<HTMLElement | null>;
  /**
   * Scroll-driven 0..1 (see useSectionScrub): 0 = fully exploded,
   * 1 = assembled. Read every frame; it's a content-position change, so
   * it is NOT gated by prefers-reduced-motion.
   */
  progressRef: RefObject<number>;
  /**
   * Explode offsets per mesh name (regex source), in units of the model's
   * maxDim, in the model's own (Y-up) space. Meshes not matched stay put.
   */
  offsets: Record<string, [number, number, number]>;
  fit?: number;
  spin?: number;
  tilt?: number;
  yaw?: number;
  light?: number;
}

interface ExplodedModelProps extends ExplodedModelSpec {
  animate: boolean;
}

interface MovingPart {
  mesh: THREE.Object3D;
  rest: THREE.Vector3;
  offset: THREE.Vector3;
}

/**
 * T11/T12: an "exploded view" that assembles itself as the reader scrolls
 * through its section -- used for the Nodo in Cómo trabajamos (the three
 * steps end in "armamos el set e instalamos"). Each named mesh keeps its
 * authored rest position and is displaced by `offset * (1 - progress)`,
 * eased, with a slight per-part lag so the lid settles after the screws
 * start moving rather than everything sliding in lockstep.
 */
export function ExplodedModel({
  url,
  anchorRef,
  progressRef,
  offsets,
  animate,
  fit = 0.72,
  spin = 0.18,
  tilt = 0.42,
  yaw = -0.6,
  light = 1.2,
}: ExplodedModelProps) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  const { object, maxDim, parts } = useMemo(() => {
    const clone = scene.clone(true);
    clone.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const dims = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(dims.x, dims.y, dims.z) || 1;
    const holder = new THREE.Group();
    clone.position.sub(center);
    holder.add(clone);

    const rules = Object.entries(offsets).map(([pattern, o]) => ({ re: new RegExp(pattern, 'i'), o }));
    const parts: MovingPart[] = [];
    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const rule = rules.find((r) => r.re.test(child.name) || r.re.test(child.parent?.name ?? ''));
      if (!rule) return;
      parts.push({
        mesh: child,
        rest: child.position.clone(),
        offset: new THREE.Vector3(rule.o[0], rule.o[1], rule.o[2]).multiplyScalar(maxDim),
      });
    });
    return { object: holder, maxDim, parts };
  }, [scene, offsets]);

  useAnchoredGroup(anchorRef, groupRef, { fit, maxDim, tilt, spin, animate });

  useFrame(() => {
    const p = THREE.MathUtils.clamp(progressRef.current, 0, 1);
    parts.forEach((part, i) => {
      // Small stagger: later parts (by list order) lag a bit.
      const lag = (i / Math.max(parts.length, 1)) * 0.25;
      const local = THREE.MathUtils.clamp((p - lag) / (1 - lag), 0, 1);
      const eased = 1 - Math.pow(1 - local, 3);
      part.mesh.position.copy(part.rest).addScaledVector(part.offset, 1 - eased);
    });
  });

  return (
    <group ref={groupRef} rotation={[tilt, yaw, 0]}>
      <pointLight position={[maxDim * 1.6, maxDim * 1.8, maxDim * 2.2]} intensity={light} decay={0} />
      <pointLight position={[-maxDim * 2, maxDim * 0.6, -maxDim * 1.2]} intensity={light * 0.6} decay={0} color="#8fb4ff" />
      <primitive object={object} />
    </group>
  );
}
