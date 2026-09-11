import { test, expect, type Page } from '@playwright/test';

/**
 * Scene end-to-end (spec 13 §10). These assert the *contract* of the scene,
 * not pixels: which tramo `resolveTramo` picks as the scroll advances, that
 * reduced-motion quantises `t`, and that `?no3d` degrades to the DOM poster.
 */

interface SceneDebug {
  registry: { markDirty(): void; getProgress(i: number): number };
  resolve(): { a: string; b: string; t: number; index: number };
  tier: string;
}
declare global {
  interface Window {
    __scene?: SceneDebug;
  }
}

/**
 * Waits for the canvas to have reported ready (it is what adds `scene-3d`
 * and installs `window.__scene`) and for the layout it changes to settle:
 * `.scene-3d` reveals `.capacidades__stage`, which moves every section below
 * it, so `PageSceneHost` re-measures the ScrollTriggers on the next frame.
 */
async function waitForScene(page: Page) {
  await page.waitForFunction(() => document.documentElement.classList.contains('scene-3d'));
  await page.waitForFunction(() => !!window.__scene);
  await page.waitForTimeout(500);
}

/** Scrolls, lets the 0.4 s scrub settle, then forces one frame so the read is current. */
async function scrollAndRead(page: Page, y: number) {
  await page.evaluate((to) => window.scrollTo(0, to), y);
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__scene!.registry.markDirty());
  await page.waitForTimeout(300);
  return page.evaluate(() => window.__scene!.resolve());
}

const positions = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0];

test('tramos avanzan con el scroll', async ({ page }) => {
  await page.goto('/?debug');
  await waitForScene(page);
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  expect(max).toBeGreaterThan(0);

  const seen: string[] = [];
  for (const f of positions) {
    const r = await scrollAndRead(page, max * f);
    seen.push(r.a);
  }

  expect(seen[0]).toBe('logo');
  expect(seen.at(-1)).toBe('nodo');
  expect(new Set(seen).size).toBeGreaterThanOrEqual(4);
});

test('reduced motion cuantiza', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?debug');
  await waitForScene(page);
  const r = await scrollAndRead(page, 600);
  expect(r.t === 0 || r.t === 1).toBe(true);
});

test('?no3d muestra poster y placeholders', async ({ page }) => {
  await page.goto('/?no3d');
  await expect(page.locator('.hero__poster')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});
