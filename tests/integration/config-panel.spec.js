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
  test.describe(`Config Panel (${vp.name} ${vp.width}x${vp.height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/howler*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: howlerMock,
        });
      });
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');

      // Wait for home screen to fully load inside the iframe
      const screenFrame = page.frameLocator('#thescreen');
      await screenFrame.locator('[id="#gear"]').waitFor({ state: 'visible' });
    });

    test('opens config panel by clicking gear icon', async ({ page }) => {
      const screenFrame = page.frameLocator('#thescreen');
      const menuFrame = page.frameLocator('#themenu');

      // Config panel starts closed (menu width 0, shader transparent)
      await expect(page.locator('#themenu')).toHaveCSS('width', '0px');
      await expect(page.locator('#shader')).toHaveCSS('opacity', '0');

      // Click gear icon in home screen iframe
      await screenFrame.locator('[id="#gear"]').click();

      // Wait for config content to load in the menu iframe
      await menuFrame.locator('[id="#back"]').waitFor({ state: 'visible' });

      // Shader should become semi-transparent (menu overlay)
      await expect(page.locator('#shader')).toHaveCSS('opacity', '0.5');

      // Config panel elements should be visible
      await expect(menuFrame.locator('[id="#download_stats"]')).toBeVisible();
      await expect(menuFrame.locator('[id="#clear_storage"]')).toBeVisible();
      await expect(menuFrame.locator('[id="#level_up"]')).toBeVisible();
      await expect(menuFrame.locator('[id="#level_down"]')).toBeVisible();
    });

    test('closes config panel via back triangle', async ({ page }) => {
      const screenFrame = page.frameLocator('#thescreen');
      const menuFrame = page.frameLocator('#themenu');

      // Open config
      await screenFrame.locator('[id="#gear"]').click();
      await menuFrame.locator('[id="#back"]').waitFor({ state: 'visible' });
      await expect(page.locator('#shader')).toHaveCSS('opacity', '0.5');

      // Click back triangle in config panel
      await menuFrame.locator('[id="#back"]').click();

      // Panel should close
      await expect(page.locator('#shader')).toHaveCSS('opacity', '0');
      await expect(page.locator('#themenu')).toHaveCSS('width', '0px');

      // Home screen gear icon should still be visible
      await expect(screenFrame.locator('[id="#gear"]')).toBeVisible();
    });

    // The menu iframe occupies the left 60%, so the exposed backdrop is the
    // right 40%. Pick a point well clear of the menu edge.
    const backdropPoint = { x: vp.width * 0.85, y: vp.height * 0.5 };

    test('closes config panel by tapping the greyed backdrop', async ({ page }) => {
      const screenFrame = page.frameLocator('#thescreen');
      const menuFrame = page.frameLocator('#themenu');

      await screenFrame.locator('[id="#gear"]').click();
      await menuFrame.locator('[id="#back"]').waitFor({ state: 'visible' });
      await expect(page.locator('#shader')).toHaveCSS('opacity', '0.5');

      await page.mouse.click(backdropPoint.x, backdropPoint.y);

      await expect(page.locator('#shader')).toHaveCSS('opacity', '0');
      await expect(page.locator('#themenu')).toHaveCSS('width', '0px');
      await expect(screenFrame.locator('[id="#gear"]')).toBeVisible();
    });

    // Going through go_back() rather than hide_menu() matters: it pops the
    // entry the gear pushed, so the browser back button stays meaningful.
    test('backdrop tap pops the config history entry', async ({ page }) => {
      const screenFrame = page.frameLocator('#thescreen');
      const menuFrame = page.frameLocator('#themenu');

      await screenFrame.locator('[id="#gear"]').click();
      await menuFrame.locator('[id="#back"]').waitFor({ state: 'visible' });
      expect(await page.evaluate(() => window.history.state.page)).toBe('config');

      await page.mouse.click(backdropPoint.x, backdropPoint.y);
      await expect(page.locator('#shader')).toHaveCSS('opacity', '0');

      expect(await page.evaluate(() => window.history.state.page)).toBe('home');
    });

    // The backdrop covers the whole viewport and sits above the play button
    // (z-index 4 vs 2), so it must only accept pointer events while open.
    test('backdrop is inert while the menu is closed', async ({ page }) => {
      const screenFrame = page.frameLocator('#thescreen');
      const menuFrame = page.frameLocator('#themenu');

      await expect(page.locator('#shader')).toHaveCSS('pointer-events', 'none');

      await screenFrame.locator('[id="#gear"]').click();
      await menuFrame.locator('[id="#back"]').waitFor({ state: 'visible' });
      await expect(page.locator('#shader')).toHaveCSS('pointer-events', 'auto');

      await page.mouse.click(backdropPoint.x, backdropPoint.y);
      await expect(page.locator('#shader')).toHaveCSS('pointer-events', 'none');
    });

    // Regression: the tap that dismisses the menu must not fall through and
    // start a game once the backdrop stops accepting pointer events.
    test('backdrop tap does not start a game', async ({ page }) => {
      const screenFrame = page.frameLocator('#thescreen');
      const menuFrame = page.frameLocator('#themenu');

      await screenFrame.locator('[id="#gear"]').click();
      await menuFrame.locator('[id="#back"]').waitFor({ state: 'visible' });

      await page.mouse.click(backdropPoint.x, backdropPoint.y);
      await expect(page.locator('#shader')).toHaveCSS('opacity', '0');

      await page.waitForTimeout(400); // long enough for a synthesised click
      expect(await page.evaluate(() => window.myInterval)).toBe(0);
    });

    test('closes config panel via browser back button', async ({ page }) => {
      const screenFrame = page.frameLocator('#thescreen');
      const menuFrame = page.frameLocator('#themenu');

      // Open config
      await screenFrame.locator('[id="#gear"]').click();
      await menuFrame.locator('[id="#back"]').waitFor({ state: 'visible' });
      await expect(page.locator('#shader')).toHaveCSS('opacity', '0.5');

      // Use browser back (triggers popstate for pushState-based navigation)
      await page.evaluate(() => window.history.back());

      // Panel should close
      await expect(page.locator('#shader')).toHaveCSS('opacity', '0');
      await expect(page.locator('#themenu')).toHaveCSS('width', '0px');

      // Home screen should still be functional
      await expect(screenFrame.locator('[id="#gear"]')).toBeVisible();
    });
  });
}

// With touch available, Modernizr.touchevents flips clickEvnt from "click" to
// "touchstart", which is the path real phone users hit — and the one where a
// synthesised follow-up click could fall through onto the play button.
test.describe('Config Panel (touch)', () => {
  test.use({ hasTouch: true, viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/howler*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: howlerMock,
      });
    });
    await page.goto('/');
    await page.frameLocator('#thescreen').locator('[id="#gear"]').waitFor({ state: 'visible' });
  });

  // clickEvnt itself is a top-level `const`, so it is not a window property —
  // assert the Modernizr flag that decides it instead.
  test('Modernizr detects touch, so clickEvnt is touchstart', async ({ page }) => {
    expect(await page.evaluate(() => Boolean(window.Modernizr.touchevents))).toBe(true);
  });

  test('tapping the backdrop closes the menu without starting a game', async ({ page }) => {
    const screenFrame = page.frameLocator('#thescreen');
    const menuFrame = page.frameLocator('#themenu');

    await screenFrame.locator('[id="#gear"]').tap();
    await menuFrame.locator('[id="#back"]').waitFor({ state: 'visible' });
    await expect(page.locator('#shader')).toHaveCSS('opacity', '0.5');

    // Right 40% of the viewport — clear of the 60%-wide menu.
    await page.touchscreen.tap(320, 333);

    await expect(page.locator('#shader')).toHaveCSS('opacity', '0');
    await expect(page.locator('#themenu')).toHaveCSS('width', '0px');
    expect(await page.evaluate(() => window.history.state.page)).toBe('home');

    await page.waitForTimeout(400); // ghost-click window
    expect(await page.evaluate(() => window.myInterval)).toBe(0);
  });
});
