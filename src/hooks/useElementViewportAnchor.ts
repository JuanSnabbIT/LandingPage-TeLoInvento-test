import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export interface ViewportAnchor {
  /** Horizontal center of the element, as a 0-1 fraction of viewport width. */
  u: number;
  /** Vertical center of the element, as a 0-1 fraction of viewport height (0 = top). */
  v: number;
  /** false until the element has been measured at least once. */
  ready: boolean;
}

export interface UseElementViewportAnchorOptions {
  /**
   * Re-measure on `scroll`, not just `resize`. Default false -- fine for
   * an anchor that only needs to track layout reflow (resize, content
   * height changes), not one that's meant to be scrolled toward/away from
   * while a scroll-linked animation reads its position every frame. An
   * earlier round found that naively turning this on for a position
   * computed from scroll math directly (no real CSS pin) lagged a frame
   * or two behind fast scrolling -- visible whiplash -- so don't flip it
   * on without a real reason tied to how the anchor's position is
   * actually being used.
   */
  trackScroll?: boolean;
}

const DEFAULT_ANCHOR: ViewportAnchor = { u: 0.5, v: 0.5, ready: false };

/**
 * Tracks where a DOM element sits on screen as a normalized viewport
 * fraction (NOT a pixel rect, NOT a bounding box to clip anything to).
 *
 * This is the bridge between ordinary page layout -- where a section's
 * copy/CTA/placeholder naturally flows -- and the persistent, page-level
 * r3f canvas (docs/architecture/3d-web-standard.md §2/§7: one canvas,
 * mounted once at the app root, not boxed inside each section). The
 * canvas has no idea about DOM layout, so a scene anchors its 3D content
 * to a DOM element's on-screen position via this hook instead of being
 * rendered inside that element.
 *
 * `trackScroll` (see `UseElementViewportAnchorOptions`) picks between a
 * target whose on-screen position only needs to stay correct across
 * layout reflow (resize-only, the default) vs. one that's meant to be
 * tracked live as the user scrolls -- see that option's own doc comment.
 */
export function useElementViewportAnchor(
  ref: RefObject<Element | null>,
  options?: UseElementViewportAnchorOptions,
): ViewportAnchor {
  const trackScroll = options?.trackScroll ?? false;
  const [anchor, setAnchor] = useState<ViewportAnchor>(DEFAULT_ANCHOR);
  const frameRef = useRef<number | null>(null);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setAnchor({
      u: centerX / window.innerWidth,
      v: centerY / window.innerHeight,
      ready: true,
    });
  }, [ref]);

  useEffect(() => {
    measure();

    const scheduleMeasure = () => {
      if (frameRef.current != null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        measure();
      });
    };

    window.addEventListener('resize', scheduleMeasure);
    if (trackScroll) {
      window.addEventListener('scroll', scheduleMeasure, { passive: true });
    }

    let resizeObserver: ResizeObserver | undefined;
    if (ref.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleMeasure);
      resizeObserver.observe(ref.current);
    }

    return () => {
      window.removeEventListener('resize', scheduleMeasure);
      if (trackScroll) {
        window.removeEventListener('scroll', scheduleMeasure);
      }
      resizeObserver?.disconnect();
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [measure, ref, trackScroll]);

  return anchor;
}
