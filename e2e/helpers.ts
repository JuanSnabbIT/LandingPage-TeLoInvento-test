import type { Page } from '@playwright/test';

/**
 * Collects everything the page reports as broken: `console.error` and any
 * uncaught exception / unhandled rejection. Nothing is filtered -- a noisy
 * console is a finding, not something to allow-list (M7).
 *
 * Lives outside `*.spec.ts` because Playwright forbids one test file from
 * importing another.
 */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}
