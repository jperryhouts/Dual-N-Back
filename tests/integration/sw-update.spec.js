const { test, expect } = require('@playwright/test');

// Helper: set up a mock navigator.serviceWorker before the page loads.
// `opts.waiting` — if true, the mock registration has a worker already in waiting state.
function mockServiceWorker(page, opts = {}) {
  return page.addInitScript((opts) => {
    window.__swMock = { postMessageCalls: [] };

    const controllerChangeListeners = [];

    const mockWorker = {
      postMessage: (msg) => { window.__swMock.postMessageCalls.push(msg); },
      state: 'installing',
      onstatechange: null,
    };

    const mockReg = {
      installing: opts.waiting ? null : mockWorker,
      waiting: opts.waiting ? mockWorker : null,
      active: null,
      onupdatefound: null,
      update: () => Promise.resolve(),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: () => Promise.resolve(mockReg),
        controller: {}, // truthy — simulates an existing SW (update, not first install)
        addEventListener: (evt, fn) => {
          if (evt === 'controllerchange') controllerChangeListeners.push(fn);
        },
      },
      configurable: true,
    });

    // Expose lifecycle triggers for the test to call via page.evaluate()
    window.__swMock.triggerUpdate = () => {
      if (mockReg.onupdatefound) mockReg.onupdatefound();
      mockWorker.state = 'installed';
      if (mockWorker.onstatechange) mockWorker.onstatechange();
    };

    window.__swMock.triggerControllerChange = () => {
      controllerChangeListeners.forEach(fn => fn());
    };
  }, opts);
}

test.describe('Service Worker Update', () => {
  test('shows update banner when a new service worker installs', async ({ page }) => {
    await mockServiceWorker(page);
    await page.goto('/');

    const banner = page.locator('#sw-update-banner');

    // Banner starts hidden
    await expect(banner).toBeHidden();

    // Simulate: SW finds a new version, downloads it, it enters "installed" state
    await page.evaluate(() => window.__swMock.triggerUpdate());

    await expect(banner).toBeVisible();
    await expect(banner).toHaveText('A new version is available. Tap here to update.');
  });

  test('shows update banner immediately when a service worker is already waiting', async ({ page }) => {
    await mockServiceWorker(page, { waiting: true });
    await page.goto('/');

    // Banner should appear on load since reg.waiting is already set
    const banner = page.locator('#sw-update-banner');
    await expect(banner).toBeVisible();
  });

  test('clicking the banner sends SKIP_WAITING and hides it', async ({ page }) => {
    await mockServiceWorker(page, { waiting: true });
    await page.goto('/');

    const banner = page.locator('#sw-update-banner');
    await expect(banner).toBeVisible();

    await banner.click();

    await expect(banner).toBeHidden();

    const calls = await page.evaluate(() => window.__swMock.postMessageCalls);
    expect(calls).toEqual([{ type: 'SKIP_WAITING' }]);
  });

  test('update banner persists across screen navigation', async ({ page }) => {
    await mockServiceWorker(page, { waiting: true });
    await page.goto('/');

    const banner = page.locator('#sw-update-banner');
    await expect(banner).toBeVisible();

    // Navigate the iframe to a different screen (config)
    await page.evaluate(() => {
      document.getElementById('thescreen').src = '/screens/config.html';
    });
    const screenFrame = page.frameLocator('#thescreen');
    await screenFrame.locator('[id="#back"]').waitFor({ state: 'attached' });

    // Banner should still be visible (it's in the parent frame, not the iframe)
    await expect(banner).toBeVisible();
  });
});
