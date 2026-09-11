import type { RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import { anchorToWorldXY, viewportWorldHeight } from '../../components/canvas/pageCameraMath';

interface UseAnchoredGroupOptions {
  /** Group height as a fraction of the anchor's on-screen height. */
  fit: number;
  /** Largest model dimension in model units (what `fit` is measured against). */
  maxDim: number;
  /** Fixed tilt around X. */
  tilt: number;
  /** Idle spin around Y, rad/s; 0 disables. */
  spin: number;
  /** false under prefers-reduced-motion -- no idle spin. */
  animate: boolean;
}

/**
 * Shared per-frame anchoring for anything rendered "inside" a DOM box from
 * the persistent canvas: live-rect position + scale (same approach as the
 * Hero's Central), tilt, optional idle spin, and hidden when the box is
 * far off-screen. Used by AnchoredModel and ExplodedModel.
 */
export function useAnchoredGroup(
  anchorRef: RefObject<HTMLElement | null>,
  groupRef: RefObject<THREE.Group | null>,
  { fit, maxDim, tilt, spin, animate }: UseAnchoredGroupOptions,
) {
  const size = useThree((state) => state.size);

  useFrame((_, delta) => {
    const el = anchorRef.current;
    const group = groupRef.current;
    if (!el || !group) return;

    const rect = el.getBoundingClientRect();
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
}
