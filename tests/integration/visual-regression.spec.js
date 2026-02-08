const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const howlerMock = fs.readFileSync(
  path.join(__dirname, '../fixtures/howler-mock.js'),
  'utf-8'
);

// Synthetic stats for the stats screen — 15 games with a realistic level progression
const syntheticStats = {
  games: [
    { time: '2025-06-01T10:00:00Z', N: 1, vStack: [0,1,2,0,3,4,5,1,6,7,0,2,3,4,5,6,7,1,0,2,3], vClicks: [3,10,17], vDelays: [420,380,510], lStack: [0,1,2,0,3,4,5,1,6,7,0,2,3,4,5,6,7,1,0,2,3], lClicks: [3,7,17], lDelays: [350,400,470], v: 1.0 },
    { time: '2025-06-01T10:05:00Z', N: 1, vStack: [1,2,3,1,4,5,6,2,7,0,1,3,4,5,6,7,0,2,1,3,4], vClicks: [3,11,18], vDelays: [390,440,360], lStack: [1,2,3,1,4,5,6,2,7,0,1,3,4,5,6,7,0,2,1,3,4], lClicks: [3,7,18], lDelays: [310,380,420], v: 1.0 },
    { time: '2025-06-02T10:00:00Z', N: 2, vStack: [0,1,2,3,1,2,4,5,3,1,6,7,0,5,6,7,2,0,1,3,5,7], vClicks: [5,14,15], vDelays: [480,520,450], lStack: [0,1,2,3,1,2,4,5,3,1,6,7,0,5,6,7,2,0,1,3,5,7], lClicks: [4,5,15], lDelays: [440,500,380], v: 1.0 },
    { time: '2025-06-02T10:05:00Z', N: 2, vStack: [2,3,0,1,3,0,5,6,1,5,7,6,4,2,7,4,3,0,1,5,6,2], vClicks: [5,9,11], vDelays: [510,460,530], lStack: [2,3,0,1,3,0,5,6,1,5,7,6,4,2,7,4,3,0,1,5,6,2], lClicks: [4,5,11], lDelays: [470,430,510], v: 1.0 },
    { time: '2025-06-03T10:00:00Z', N: 2, vStack: [1,0,3,2,0,3,6,5,2,6,4,5,7,1,4,7,0,3,2,6,5,1], vClicks: [4,5,11], vDelays: [450,490,410], lStack: [1,0,3,2,0,3,6,5,2,6,4,5,7,1,4,7,0,3,2,6,5,1], lClicks: [5,9,11], lDelays: [400,460,390], v: 1.0 },
    { time: '2025-06-04T10:00:00Z', N: 3, vStack: [0,1,2,3,4,1,2,3,5,6,4,1,7,3,5,6,0,7,2,4,6,1,3], vClicks: [5,6,7], vDelays: [580,620,550], lStack: [0,1,2,3,4,1,2,3,5,6,4,1,7,3,5,6,0,7,2,4,6,1,3], lClicks: [5,6,7], lDelays: [540,600,510], v: 1.0 },
    { time: '2025-06-04T10:05:00Z', N: 3, vStack: [2,0,1,3,5,0,1,3,6,4,5,0,2,3,6,4,7,2,1,5,4,0,3], vClicks: [5,6,7], vDelays: [620,570,640], lStack: [2,0,1,3,5,0,1,3,6,4,5,0,2,3,6,4,7,2,1,5,4,0,3], lClicks: [5,6,7], lDelays: [580,550,620], v: 1.0 },
    { time: '2025-06-05T10:00:00Z', N: 2, vStack: [3,1,0,2,1,0,4,6,2,4,5,6,7,3,5,7,1,0,2,4,6,3], vClicks: [4,5,11], vDelays: [430,470,400], lStack: [3,1,0,2,1,0,4,6,2,4,5,6,7,3,5,7,1,0,2,4,6,3], lClicks: [5,9,11], lDelays: [380,420,370], v: 1.0 },
    { time: '2025-06-06T10:00:00Z', N: 3, vStack: [1,2,0,3,4,2,0,3,5,6,4,2,7,3,5,6,1,7,0,4,6,2,3], vClicks: [5,6,7], vDelays: [560,530,590], lStack: [1,2,0,3,4,2,0,3,5,6,4,2,7,3,5,6,1,7,0,4,6,2,3], lClicks: [5,6,7], lDelays: [520,500,560], v: 1.0 },
    { time: '2025-06-06T10:05:00Z', N: 3, vStack: [0,3,1,2,4,3,1,2,6,5,4,3,7,2,6,5,0,7,1,4,5,3,2], vClicks: [5,6,7], vDelays: [540,580,520], lStack: [0,3,1,2,4,3,1,2,6,5,4,3,7,2,6,5,0,7,1,4,5,3,2], lClicks: [5,6,7], lDelays: [500,540,480], v: 1.0 },
    { time: '2025-06-07T10:00:00Z', N: 3, vStack: [3,0,2,1,5,0,2,1,4,6,5,0,7,1,4,6,3,7,2,5,6,0,1], vClicks: [5,6,7], vDelays: [510,490,530], lStack: [3,0,2,1,5,0,2,1,4,6,5,0,7,1,4,6,3,7,2,5,6,0,1], lClicks: [5,6,7], lDelays: [470,510,450], v: 1.0 },
    { time: '2025-06-08T10:00:00Z', N: 4, vStack: [0,1,2,3,4,5,1,2,3,4,6,7,5,1,0,3,6,7,2,5,0,4,6,1], vClicks: [5,8,9], vDelays: [680,720,650], lStack: [0,1,2,3,4,5,1,2,3,4,6,7,5,1,0,3,6,7,2,5,0,4,6,1], lClicks: [5,8,9], lDelays: [640,700,610], v: 1.0 },
    { time: '2025-06-08T10:05:00Z', N: 4, vStack: [2,3,0,1,4,5,3,0,1,4,7,6,5,3,2,1,7,6,0,5,2,4,7,3], vClicks: [5,8,9], vDelays: [710,670,740], lStack: [2,3,0,1,4,5,3,0,1,4,7,6,5,3,2,1,7,6,0,5,2,4,7,3], lClicks: [5,8,9], lDelays: [660,690,630], v: 1.0 },
    { time: '2025-06-09T10:00:00Z', N: 3, vStack: [2,1,3,0,4,1,3,0,6,5,4,1,7,0,6,5,2,7,3,4,5,1,0], vClicks: [5,6,7], vDelays: [530,560,500], lStack: [2,1,3,0,4,1,3,0,6,5,4,1,7,0,6,5,2,7,3,4,5,1,0], lClicks: [5,6,7], lDelays: [490,530,460], v: 1.0 },
    { time: '2025-06-09T10:05:00Z', N: 3, vStack: [1,3,0,2,5,3,0,2,4,6,5,3,7,2,4,6,1,7,0,5,6,3,2], vClicks: [5,6,7], vDelays: [500,540,480], lStack: [1,3,0,2,5,3,0,2,4,6,5,3,7,2,4,6,1,7,0,5,6,3,2], lClicks: [5,6,7], lDelays: [460,500,440], v: 1.0 },
  ],
};

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

    test('stats screen', async ({ page }) => {
      await page.goto('/');
      const screenFrame = page.frameLocator('#thescreen');
      await screenFrame.locator('[id="#gear"]').waitFor({ state: 'attached' });

      // Inject synthetic game history so charts render with data
      await page.evaluate((stats) => {
        localStorage.setItem('stats', JSON.stringify(stats));
        localStorage.setItem('N', '3');
      }, syntheticStats);

      // Navigate to stats screen via the graph icon
      await screenFrame.locator('[id="#graph"]').click();
      await screenFrame.locator('#levelhistdiv').waitFor({ state: 'visible' });
      await screenFrame.locator('#clickdelaydiv').waitFor({ state: 'visible' });

      await expect(page).toHaveScreenshot(`stats-${vp.name}.png`);
    });
  });
}
