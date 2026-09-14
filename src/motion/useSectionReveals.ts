import type { RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { motion } from './tokens';

gsap.registerPlugin(ScrollTrigger);

/**
 * What gets revealed, per section below the Hero: the direct children of
 * each section's main container (eyebrow, heading, lead, lists, visual...)
 * plus the individual cards/stats/steps inside grids, so a grid staggers
 * card by card instead of popping in as one block. `.capacidades__body` is
 * the text block of the carousel card, one level deeper than the selectors
 * reach.
 */
const TARGETS = [':scope > .wrap > *', ':scope > .wrap > div > *', '.card', '.stat', '.capacidades__body'].join(', ');
/**
 * Never revealed: grid containers (targeted through their children instead)
 * and every box the 3D scene draws into -- `.visual`, `.photo-ph`,
 * `.capacidades__stage` -- AND every element that CONTAINS one of those
 * boxes (`.capacidades__showcase`, `.capacidades__card`, `.contacto__intro`). A reveal tween on a
 * stage box, or on an ancestor of it, translates the DOM anchor the scene
 * reads its rect from every frame, so the model drifts behind its box on
 * entry (spec 13 §11; came back on 2026-09-14 when the Capacidades stage
 * moved inside the carousel card). `.capacidades__carousel` and its nav
 * buttons are skipped the same way `.card-grid` used to be.
 */
const SKIP = [
  '.card-grid', '.stat-grid', '.grid', '.form-grid', 'form',
  '.visual', '.photo-ph', '.capacidades__stage',
  '.capacidades__showcase', '.capacidades__card', '.contacto__intro',
  '.capacidades__carousel', '.capacidades__nav',
].join(', ');

/** Elements a section reveals -- exported so a test can assert none of them wraps a stage box. */
export function revealTargets(section: HTMLElement): HTMLElement[] {
  return Array.from(section.querySelectorAll<HTMLElement>(TARGETS)).filter((el) => !el.matches(SKIP));
}

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
 * Deliberately restrained: the scene's scroll choreography is the page's
 * one "moment"; everything after it should feel settled, not animated for
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
        const elements = revealTargets(section);
        if (elements.length === 0) continue;

        gsap.from(elements, {
          opacity: 0,
          y: motion.reveal.distance,
          duration: motion.duration.reveal,
          ease: motion.ease.out,
          stagger: motion.stagger.grid,
          scrollTrigger: { trigger: section, start: 'top 82%', once: true },
        });
      }
    },
    { scope: scopeRef, dependencies: [reduced], revertOnUpdate: true },
  );
}
