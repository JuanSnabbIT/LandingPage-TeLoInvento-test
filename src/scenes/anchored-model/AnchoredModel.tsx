import { useMemo, useRef, type RefObject } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useAnchoredGroup } from './useAnchoredGroup';

export interface AnchoredPartSpec {
  /** GLB under public/. */
  url: string;
  /** Offset from the main model's center, in units of the MAIN model's maxDim. */
  offset: [number, number, number];
  /** This part's maxDim as a fraction of the main model's maxDim. Default 0.5. */
  scale?: number;
  /** Own yaw (radians) so companions don't all face the same way. Default 0. */
  yaw?: number;
}

export interface AnchoredModelSpec {
  /** GLB under public/ (e.g. `/models/solucion/central-kiosk.glb`). */
  url: string;
  /** DOM box the model is fitted into and follows on scroll. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Model height as a fraction of the anchor's on-screen height. Default 0.7. */
  fit?: number;
  /** Idle spin around Y, radians/second. Default 0.25. 0 disables. */
  spin?: number;
  /** Fixed tilt around X (radians) so a flat-topped object reads in 3D. Default 0.28. */
  tilt?: number;
  /** Initial yaw (radians). Default 0. */
  yaw?: number;
  /** Intensity of the model's own key/rim light (dark boxes need more than the shared scene lights). Default 1.2. */
  light?: number;
  /** Companion models placed around the main one (e.g. Nodos next to the Central), spinning with it as one set. */
  parts?: AnchoredPartSpec[];
}

interface AnchoredModelProps extends AnchoredModelSpec {
  /** false under prefers-reduced-motion -- no idle spin, the model just sits. */
  animate: boolean;
}

/** Recentered clone of a GLB scene + its largest dimension. */
function useCenteredModel(url: string) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const clone = scene.clone(true);
    clone.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const dims = box.getSize(new THREE.Vector3());
    const holder = new THREE.Group();
    clone.position.sub(center);
    holder.add(clone);
    return { object: holder, maxDim: Math.max(dims.x, dims.y, dims.z) || 1 };
  }, [scene]);
}

function Part({ spec, mainMaxDim }: { spec: AnchoredPartSpec; mainMaxDim: number }) {
  const { object, maxDim } = useCenteredModel(spec.url);
  const scale = ((spec.scale ?? 0.5) * mainMaxDim) / maxDim;
  const [ox, oy, oz] = spec.offset;
  return (
    <group position={[ox * mainMaxDim, oy * mainMaxDim, oz * mainMaxDim]} rotation={[0, spec.yaw ?? 0, 0]} scale={scale}>
      <primitive object={object} />
    </group>
  );
}

/**
 * T11: a solid GLB rendered inside the persistent page canvas, fitted into
 * an ordinary DOM box (a section's `.visual` / placeholder) and glued to
 * it on scroll -- the same live-rect anchoring HeroCentralScene uses, in
 * a reusable form. No boxed <Canvas> per section
 * (docs/architecture/3d-web-standard.md §2/§7); the canvas layer sits
 * above page content, so the model draws over the box's own background.
 * Optional `parts` compose a set (Central + Nodos) that turns as one.
 */
export function AnchoredModel({
  url,
  anchorRef,
  animate,
  fit = 0.7,
  spin = 0.25,
  tilt = 0.28,
  yaw = 0,
  light = 1.2,
  parts = [],
}: AnchoredModelProps) {
  const { object, maxDim } = useCenteredModel(url);
  const groupRef = useRef<THREE.Group>(null);
  useAnchoredGroup(anchorRef, groupRef, { fit, maxDim, tilt, spin, animate });

  return (
    <group ref={groupRef} rotation={[tilt, yaw, 0]}>
      {/* Per-model key + rim, in the group's own (model-unit) space so
          they scale with it and turn with it (a fixed highlight on the
          product while it spins, which reads as a studio turntable).
          decay=0 keeps intensity independent of the tiny real-world
          model size. */}
      <pointLight position={[maxDim * 1.6, maxDim * 1.8, maxDim * 2.2]} intensity={light} decay={0} />
      <pointLight position={[-maxDim * 2, maxDim * 0.6, -maxDim * 1.2]} intensity={light * 0.6} decay={0} color="#8fb4ff" />
      <primitive object={object} />
      {parts.map((spec, i) => (
        <Part key={`${spec.url}-${i}`} spec={spec} mainMaxDim={maxDim} />
      ))}
    </group>
  );
}
