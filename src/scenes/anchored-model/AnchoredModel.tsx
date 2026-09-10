import { useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { anchorToWorldXY, viewportWorldHeight } from '../../components/canvas/pageCameraMath';

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
}

interface AnchoredModelProps extends AnchoredModelSpec {
  /** false under prefers-reduced-motion -- no idle spin, the model just sits. */
  animate: boolean;
}

/**
 * T11: a solid GLB rendered inside the persistent page canvas, fitted into
 * an ordinary DOM box (a section's `.visual` / placeholder) and glued to
 * it on scroll -- the same live-rect anchoring HeroCentralScene uses, in
 * a reusable form. No boxed <Canvas> per section
 * (docs/architecture/3d-web-standard.md §2/§7); the canvas layer sits
 * above page content, so the model draws over the box's own background.
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
}: AnchoredModelProps) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const size = useThree((state) => state.size);

  // Recentered clone so the group rotates around the model's own center,
  // and maxDim so it can be fitted to the anchor's pixel height.
  const { object, maxDim } = useMemo(() => {
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

  useFrame((_, delta) => {
    const el = anchorRef.current;
    const group = groupRef.current;
    if (!el || !group) return;

    const rect = el.getBoundingClientRect();
    // Skip work while the box is well off-screen.
    if (rect.bottom < -rect.height || rect.top > window.innerHeight + rect.height) {
      group.visible = false;
      return;
    }
    group.visible = true;

    const u = (rect.left + rect.width / 2) / window.innerWidth;
    const v = (rect.top + rect.height / 2) / window.innerHeight;
    const aspect = size.width / Math.max(size.height, 1);
    const { x, y } = anchorToWorldXY(u, v, aspect);
    group.position.set(x, y, 0);

    const worldPerPx = viewportWorldHeight() / Math.max(window.innerHeight, 1);
    const desired = fit * rect.height * worldPerPx;
    if (desired > 0) group.scale.setScalar(desired / maxDim);

    group.rotation.x = tilt;
    if (animate && spin) group.rotation.y += spin * Math.min(delta, 1 / 30);
  });

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
    </group>
  );
}
