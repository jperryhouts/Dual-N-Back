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
