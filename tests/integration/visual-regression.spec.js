const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const howlerMock = fs.readFileSync(
  path.join(__dirname, '../fixtures/howler-mock.js'),
  'utf-8'
);

const viewports = [
  { name: 'phone', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
];

for (const vp of viewports) {
  test.describe(`Visual Regression — ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Mock Howler.js CDN request
      await page.route('**/howler*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: howlerMock,
        });
      });

      // Install fake timers before page load so setInterval is virtualized
      await page.clock.install();
    });

    test('home screen', async ({ page }) => {
      await page.goto('/');
      const screenFrame = page.frameLocator('#thescreen');
      await screenFrame.locator('[id="#gear"]').waitFor({ state: 'attached' });
      await page.locator('div[id="#play"]').waitFor({ state: 'visible' });

      await expect(page).toHaveScreenshot(`home-${vp.name}.png`);
    });

    test('game screen layout', async ({ page }) => {
      await page.goto('/');
      const screenFrame = page.frameLocator('#thescreen');
      await screenFrame.locator('[id="#gear"]').waitFor({ state: 'attached' });

      // Start the game
      await page.locator('div[id="#play"] g').click();
      await screenFrame.locator('#vis_button').waitFor({ state: 'visible' });
      await page.waitForFunction(() => window.myInterval > 0);

      // Screenshot before any timestep fires — grid is idle (all boxes paused),
      // buttons visible at bottom, title shows "N = 1". Fully deterministic.
      await expect(page).toHaveScreenshot(`game-idle-${vp.name}.png`);
    });

    test('score screen', async ({ page }) => {
      await page.goto('/');
      const screenFrame = page.frameLocator('#thescreen');
      await screenFrame.locator('[id="#gear"]').waitFor({ state: 'attached' });

      // Start the game
      await page.locator('div[id="#play"] g').click();
      await screenFrame.locator('#vis_button').waitFor({ state: 'visible' });
      await page.waitForFunction(() => window.myInterval > 0);

      const seqLength = await page.evaluate(() => window.vis_stack.length);

      // Advance through all timesteps without clicking anything
      for (let t = 0; t <= seqLength; t++) {
        await page.clock.runFor(3000);
      }

      // Wait for score screen to load
      await screenFrame.locator('#vis_hits').waitFor({ state: 'attached' });

      await expect(page).toHaveScreenshot(`score-${vp.name}.png`);
    });
  });
}
