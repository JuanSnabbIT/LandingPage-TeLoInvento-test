/**
 * Constants + math for the persistent, page-level camera
 * (docs/architecture/3d-web-standard.md §2/§7 -- one canvas/camera for the
 * whole page, sections don't get their own boxed camera). Generic on
 * purpose: any scene mounted in PersistentSceneLayer uses these to convert
 * a DOM anchor (see useElementViewportAnchor) into a world-space position.
 */

/** Camera sits on +Z at this distance, looking straight down -Z at the origin. */
export const PAGE_CAMERA_DISTANCE = 10;

export const PAGE_CAMERA_FOV_DEG = 40;

/**
 * Converts a DOM element's normalized viewport-fraction anchor (u,v in
 * [0,1], v=0 at the top of the viewport) into a world-space X/Y position
 * on the z=0 plane -- i.e. "where do I put a group so it lands under this
 * point on screen," for a camera at (0,0,PAGE_CAMERA_DISTANCE) looking
 * straight down -Z with no tilt/roll. `aspect` is the canvas's current
 * width/height (read reactively from useThree, not assumed).
 */
export function anchorToWorldXY(u: number, v: number, aspect: number): { x: number; y: number } {
  const fovRad = (PAGE_CAMERA_FOV_DEG * Math.PI) / 180;
  const halfHeight = PAGE_CAMERA_DISTANCE * Math.tan(fovRad / 2);
  const halfWidth = halfHeight * aspect;

  const ndcX = u * 2 - 1;
  const ndcY = 1 - v * 2;

  return { x: ndcX * halfWidth, y: ndcY * halfHeight };
}

/** Full viewport height in world units at the z=0 plane -- used to size content relative to viewport height. */
export function viewportWorldHeight(): number {
  const fovRad = (PAGE_CAMERA_FOV_DEG * Math.PI) / 180;
  return 2 * PAGE_CAMERA_DISTANCE * Math.tan(fovRad / 2);
}
