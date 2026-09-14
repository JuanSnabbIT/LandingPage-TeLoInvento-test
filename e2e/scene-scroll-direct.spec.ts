import { test, expect } from '@playwright/test';
import { collectErrors } from './helpers';

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`scroll directo, pausa e inversión ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = collectErrors(page);
    await page.goto('/?debug&force3d');
    await page.waitForFunction(() => !!window.__scene);
    await page.waitForTimeout(500);
    const start = await page.locator('.problema .visual').evaluate(el => el.getBoundingClientRect().top + scrollY - innerHeight * .75);
    await page.evaluate(y => scrollTo(0, y), start);
    await page.waitForTimeout(250);
    const before = await page.evaluate(() => window.__scene!.resolve());
    expect(before.index).toBe(0);
    expect(before.t).toBeGreaterThan(0);
    expect(before.t).toBeLessThan(1);
    await page.mouse.wheel(0, 60);
    await page.waitForTimeout(250);
    const moved = await page.evaluate(() => window.__scene!.resolve());
    expect(moved.t).toBeGreaterThan(before.t);
    await page.waitForTimeout(500);
    expect((await page.evaluate(() => window.__scene!.resolve())).t).toBeCloseTo(moved.t, 8);
    await page.waitForTimeout(1000);
    expect((await page.evaluate(() => window.__scene!.resolve())).t).toBeCloseTo(moved.t, 8);
    await page.mouse.wheel(0, -60);
    await page.waitForTimeout(250);
    expect((await page.evaluate(() => window.__scene!.resolve())).t).toBeCloseTo(before.t, 2);
    await page.reload();
    await page.waitForFunction(() => !!window.__scene);
    await page.waitForTimeout(800);
    expect((await page.evaluate(() => window.__scene!.resolve())).t).toBeCloseTo(before.t, 2);
    expect(errors).toEqual([]);
  });
}
