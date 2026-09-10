import type { RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

gsap.registerPlugin(ScrollTrigger);

/**
 * What gets revealed, per section below the Hero: the direct children of
 * each section's main container (eyebrow, heading, lead, lists, visual...)
 * plus the individual cards/stats/steps inside grids, so a grid staggers
 * card by card instead of popping in as one block.
 */
const TARGETS = [':scope > .wrap > *', ':scope > .wrap > div > *', ':scope > .band > *', '.card', '.stat'].join(', ');
const SKIP = '.card-grid, .stat-grid, .grid, .form-grid, form, .visual';

const DISTANCE_PX = 22;
const DURATION_S = 0.7;
const STAGGER_S = 0.07;

/**
 * T12: subtle fade-up reveal for every content section as it scrolls into
 * view. One tween per section (its targets stagger together), played once
 * and never replayed on scroll back up. Entirely skipped when the OS asks
 * for reduced motion -- content is simply visible.
 *
 * Not ScrollTrigger.batch: with `once: true` its per-element triggers get
 * killed before the batched callback runs, which handed gsap.to() an
 * array containing `undefined` and threw ("reading '_gsap'") -- leaving
 * everything stuck at opacity 0. A per-section trigger has no such race.
 *
 * Deliberately restrained: the Hero's 3D dissolve is the page's one
 * "moment"; everything after it should feel settled, not animated for
 * its own sake (06-direccion-visual.md).
 */
export function useSectionReveals(scopeRef: RefObject<HTMLElement | null>) {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      const scope = scopeRef.current;
      if (reduced || !scope) return;

      const sections = Array.from(scope.querySelectorAll<HTMLElement>('section:not(.hero)'));
      for (const section of sections) {
        // Grid containers are targeted through their children, never
        // themselves -- so a card-grid's own opacity is untouched and
        // only its cards animate.
        const elements = Array.from(section.querySelectorAll<HTMLElement>(TARGETS)).filter(
          (el) => !el.matches(SKIP),
        );
        if (elements.length === 0) continue;

        gsap.from(elements, {
          opacity: 0,
          y: DISTANCE_PX,
          duration: DURATION_S,
          ease: 'power2.out',
          stagger: STAGGER_S,
          scrollTrigger: { trigger: section, start: 'top 82%', once: true },
        });
      }
    },
    { scope: scopeRef, dependencies: [reduced], revertOnUpdate: true },
  );
}
