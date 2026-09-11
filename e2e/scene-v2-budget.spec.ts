import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __scene?: unknown;
  }
}

/**
 * Forced frame-budget degradation (T25). `?budget=1` (only honoured together
 * with `?debug`, see `forcedBudgetOptions` in `PageSceneCanvas.tsx`) makes
 * `FrameBudgetGuard` use `minFps: 1000, warmup: 0`, so the guard's rolling
 * fps window is always "too slow" and it walks the five degradation steps
 * fast instead of waiting for a genuinely slow device.
 *
 * The guard only evaluates while the scene is "active" (dirty in the last
 * 1000 ms, see `SceneTicker`/`registry.lastDirtyAt`), and `registry` only
 * gets marked dirty while a tramo's scrub tween is actually running (see
 * `useTramoScrubs.ts`'s `onUpdate` -> `registry.setProgress`) -- so idling
 * at scrollY 0 (before any tramo's trigger range starts) never renders a
 * single frame. The test scrolls within an active tramo's range instead of
 * from the very top; see task-25-report.md for what was observed.
 */
test('?debug&budget=1 degrades to poster within the frame budget', async ({ page }) => {
  const messages: string[] = [];
  page.on('console', (msg) => messages.push(msg.text()));

  await page.goto('/?v2&debug&budget=1');
  await page.waitForFunction(() => document.documentElement.classList.contains('scene-v2'));
  await page.waitForFunction(() => !!window.__scene);
  await page.waitForTimeout(500);

  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const base = max * 0.5;

  // Nudge scroll every 100ms, oscillating around `base`, to keep the scene
  // dirty (headless rAF can be throttled below the 8fps/0.3s-delta
  // contiguity cutoff at coarser intervals -- see task-25-report.md).
  let toggled = false;
  const nudge = setInterval(() => {
    toggled = !toggled;
    const to = toggled ? base + 40 : base;
    void page.evaluate((y) => window.scrollTo(0, y), to);
  }, 100);

  try {
    await expect(page.locator('html')).toHaveClass(/scene-poster/, { timeout: 25_000 });
    await expect(page.locator('canvas')).toHaveCount(0, { timeout: 5_000 });
    const degraded = await page.evaluate(() => sessionStorage.getItem('teloinvento:scene-v2-degraded'));
    expect(degraded).not.toBeNull();
    expect(Number(degraded)).not.toBeNaN();
  } finally {
    clearInterval(nudge);
  }

  const steps = ['dpr1.5', 'dpr1', 'noCurl', 'reduced', 'poster'];
  const seen = messages.filter((m) => m.includes('[scene] budget step'));
  const seenSteps = seen.map((m) => m.trim().split(' ').at(-1));
  expect(seenSteps).toEqual(steps);
});
