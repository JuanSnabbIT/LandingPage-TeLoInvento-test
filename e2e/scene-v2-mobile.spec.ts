import { test, expect, type Page } from '@playwright/test';

/**
 * Scene v2 mobile emulation (T25). Same tramo-progression contract as
 * `scene-v2.spec.ts`, but under a real mobile viewport/DPR/touch profile so
 * we also assert the `low` tier, the `.capacidades__stage` mobile height
 * (Capacidades.css `@media (max-width: 900px)`), and that nothing overflows
 * horizontally.
 */
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });

interface SceneDebug {
  registry: { markDirty(): void; getProgress(i: number): number };
  resolve(): { a: string; b: string; t: number; index: number };
  tier: { tier: string; lod: string; dpr: [number, number]; curl: boolean };
}
declare global {
  interface Window {
    __scene?: SceneDebug;
  }
}

async function waitForScene(page: Page) {
  await page.waitForFunction(() => document.documentElement.classList.contains('scene-v2'));
  await page.waitForFunction(() => !!window.__scene);
  await page.waitForTimeout(500);
}

async function scrollAndRead(page: Page, y: number) {
  await page.evaluate((to) => window.scrollTo(0, to), y);
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__scene!.registry.markDirty());
  await page.waitForTimeout(300);
  return page.evaluate(() => window.__scene!.resolve());
}

const positions = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0];

test('mobile: tier low, sin overflow horizontal, franja 160px y tramos avanzan', async ({ page }) => {
  await page.goto('/?v2&debug');
  await waitForScene(page);

  const tier = await page.evaluate(() => window.__scene!.tier);
  expect(tier.tier).toBe('low');
  expect(tier.lod).toBe('mobile');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(overflow).toBe(true);

  const stageHeight = await page.evaluate(
    () => document.querySelector('.capacidades__stage')!.getBoundingClientRect().height,
  );
  expect(stageHeight).toBe(160);

  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  expect(max).toBeGreaterThan(0);

  const seen: string[] = [];
  for (const f of positions) {
    const r = await scrollAndRead(page, max * f);
    seen.push(r.a);
  }

  expect(seen[0]).toBe('logo');
  expect(seen.at(-1)).toBe('nodo');
});
