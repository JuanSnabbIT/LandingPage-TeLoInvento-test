export interface ScissorViewport { width: number; height: number }
export interface ScissorRect { x: number; y: number; w: number; h: number }

interface Bounds { left: number; top: number; right: number; bottom: number }

function boundsOf(a: DOMRectReadOnly | null, b: DOMRectReadOnly | null): Bounds | null {
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
  a: DOMRectReadOnly | null,
  b: DOMRectReadOnly | null,
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
