import { useEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scrubbed 0..1 for one section, written into a ref every scroll frame:
 * 0 when the section's top reaches `startAt` of the viewport, 1 when its
 * center reaches `endAt`. Lives in App (passive effect) for the same
 * reason as useChoreographyScroll: every child ref is attached by then.
 */
export function useSectionScrub(
  sectionRef: RefObject<HTMLElement | null>,
  progressRef: RefObject<number>,
  { startAt = '85%', endAt = '45%' }: { startAt?: string; endAt?: string } = {},
) {
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: `top ${startAt}`,
      end: `center ${endAt}`,
      scrub: true,
      onUpdate: (self) => {
        progressRef.current = self.progress;
      },
    });
    return () => trigger.kill();
  }, [sectionRef, progressRef, startAt, endAt]);
}
