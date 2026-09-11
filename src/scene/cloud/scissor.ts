export interface ScissorViewport { width: number; height: number }
export interface ScissorRect { x: number; y: number; w: number; h: number }
// Structural subset of DOMRectReadOnly — lets lerpRect build plain objects
// without having to fake the DOM-only members (x, y, toJSON).
export interface RectLike { left: number; top: number; right: number; bottom: number; width: number; height: number }

interface Bounds { left: number; top: number; right: number; bottom: number }

function boundsOf(a: RectLike | null, b: RectLike | null): Bounds | null {
  if (!a && !b) return null;
  return {
    left: Math.min(a?.left ?? Infinity, b?.left ?? Infinity),
    top: Math.min(a?.top ?? Infinity, b?.top ?? Infinity),
    right: Math.max(a?.right ?? -Infinity, b?.right ?? -Infinity),
    bottom: Math.max(a?.bottom ?? -Infinity, b?.bottom ?? -Infinity),
  };
}

/**
 * Union of the two given rects (either may be null), expanded by `marginFrac`
 * of the union's own width/height on each side, clamped to the viewport, and
 * converted to the bottom-left origin `WebGLRenderer.setScissor` expects
 * (CSS pixels — the caller must not multiply by devicePixelRatio, three does
 * that internally). Returns null when there is nothing to union, or when the
 * clamped box is empty.
 */
export function unionRect(
  a: RectLike | null,
  b: RectLike | null,
  marginFrac: number,
  viewport: ScissorViewport,
): ScissorRect | null {
  const u = boundsOf(a, b);
  if (!u) return null;

  const width = u.right - u.left;
  const height = u.bottom - u.top;
  const mx = marginFrac * width;
  const my = marginFrac * height;

  const left = Math.max(0, u.left - mx);
  const top = Math.max(0, u.top - my);
  const right = Math.min(viewport.width, u.right + mx);
  const bottom = Math.min(viewport.height, u.bottom + my);

  const w = right - left;
  const h = bottom - top;
  if (w <= 0 || h <= 0) return null;

  return { x: left, y: viewport.height - bottom, w, h };
}

const smooth = (x: number): number => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };

function lerpRect(a: RectLike, b: RectLike, k: number): RectLike {
  const left = a.left + (b.left - a.left) * k;
  const top = a.top + (b.top - a.top) * k;
  const right = a.right + (b.right - a.right) * k;
  const bottom = a.bottom + (b.bottom - a.bottom) * k;
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

/**
 * Scissor rect for a swarm travelling from `a` to `b`. `unionRect(a, b, …)`
 * is the union of the two full boxes — near-fullscreen once A and B sit in
 * different sections/columns, letting the cloud paint over the text between
 * them. `corridorRect` instead follows the swarm's own progress bounds —
 * the same smoothstep-with-stagger used per-particle in the vertex shader
 * (`tl = smoothstep(clamp((t − seed·stagger)/(1 − stagger)))`) — so the clip
 * is a corridor segment that starts at A (t=0), tracks the lead and trail of
 * the particle swarm as it crosses, and lands on B (t=1), instead of always
 * spanning both boxes at once. With only one rect available it falls back
 * to `unionRect`'s single-box behaviour.
 */
export function corridorRect(
  a: RectLike | null,
  b: RectLike | null,
  t: number,
  stagger: number,
  marginFrac: number,
  viewport: ScissorViewport,
): ScissorRect | null {
  if (!a || !b) return unionRect(a, b, marginFrac, viewport);
  const denom = 1 - stagger;
  const tMax = smooth(t / denom);
  const tMin = smooth((t - stagger) / denom);
  return unionRect(lerpRect(a, b, tMin), lerpRect(a, b, tMax), marginFrac, viewport);
}
