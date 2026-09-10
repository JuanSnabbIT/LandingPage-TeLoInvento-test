import { useEffect, useRef, type RefObject } from 'react';

export interface NormalizedPointer {
  /** -1 (left edge) .. 1 (right edge) of the viewport. */
  x: number;
  /** -1 (bottom edge) .. 1 (top edge) of the viewport -- NDC-style, y flipped from screen space. */
  y: number;
}

/**
 * Tracks the pointer's position as -1..1 normalized viewport coordinates
 * in a ref, not React state -- so a consumer can read it every frame
 * inside useFrame without ever calling setState there (see
 * docs/architecture/3d-web-standard.md §7). Starts at (0,0) -- the
 * viewport center -- so anything driven by this before the first
 * pointermove reads as "resting," not an arbitrary corner.
 *
 * Viewport-relative on purpose (not anchor/element-relative): simplest
 * reading for a page-level "tilt toward the cursor" effect, and the
 * persistent canvas already treats coordinates page-wide (see
 * PersistentSceneLayer). Swap to element-relative if a future scene wants
 * the tilt to track a specific anchor instead of the whole viewport.
 */
export function useNormalizedPointer(): RefObject<NormalizedPointer> {
  const pointerRef = useRef<NormalizedPointer>({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePointerMove = (event: PointerEvent) => {
      pointerRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return pointerRef;
}
