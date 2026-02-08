const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const howlerMock = fs.readFileSync(
  path.join(__dirname, '../fixtures/howler-mock.js'),
  'utf-8'
);

test.describe('Game Playthrough', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept Howler.js CDN request and serve our mock
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

  test('plays through a complete N=1 game with perfect score', async ({ page }) => {
    await page.goto('/');

    const screenFrame = page.frameLocator('#thescreen');

    // Wait for home screen to load inside the iframe
    await screenFrame.locator('[id="#gear"]').waitFor({ state: 'attached' });

    // Click the play button (in parent frame; element id is literally "#play")
    await page.locator('div[id="#play"] g').click();

    // Wait for the game screen to load in the iframe
    await screenFrame.locator('#vis_button').waitFor({ state: 'visible' });

    // Wait for audio priming to complete and setInterval to be registered
    await page.waitForFunction(() => window.myInterval > 0);

    // Read the generated game sequences from global state
    const { visStack, letterStack, gameN } = await page.evaluate(() => ({
      visStack: window.vis_stack,
      letterStack: window.letter_stack,
      gameN: window.N,
    }));

    expect(gameN).toBe(1);
    expect(visStack).toHaveLength(21); // N_plus(20) + N(1)

    // Determine which timesteps are visual/audio matches
    const visualMatches = new Set();
    const audioMatches = new Set();
    for (let i = gameN; i < visStack.length; i++) {
      if (visStack[i] === visStack[i - gameN]) visualMatches.add(i);
      if (letterStack[i] === letterStack[i - gameN]) audioMatches.add(i);
    }

    // buildGameSequence guarantees exactly 6 of each
    expect(visualMatches.size).toBe(6);
    expect(audioMatches.size).toBe(6);

    // Play through all timesteps
    for (let t = 0; t < visStack.length; t++) {
      // Advance clock to fire doTimestep — shows stimulus t, increments time to t+1
      await page.clock.runFor(3000);

      // Click the correct buttons for match timesteps.
      // eyeButtonPress() pushes time-1 (== t) into vis_clicks.
      // calculateScore() checks vis_clicks.indexOf(i) for i in [N, length).
      if (visualMatches.has(t)) {
        await screenFrame.locator('#vis_button').click();
      }
      if (audioMatches.has(t)) {
        await screenFrame.locator('#letter_button').click();
      }
    }

    // One more tick triggers the else branch in doTimestep (game over → score screen)
    await page.clock.runFor(3000);

    // Verify score screen loaded with correct results
    await screenFrame.locator('#vis_hits').waitFor({ state: 'attached' });

    await expect(screenFrame.locator('#vis_hits')).toHaveText('6');
    await expect(screenFrame.locator('#vis_misses')).toHaveText('0');
    await expect(screenFrame.locator('#vis_wrong')).toHaveText('0');
    await expect(screenFrame.locator('#letter_hits')).toHaveText('6');
    await expect(screenFrame.locator('#letter_misses')).toHaveText('0');
    await expect(screenFrame.locator('#letter_wrong')).toHaveText('0');

    // d' = hit_rate(1.0) - false_alarm_rate(0.0) = 1.0 → displayed as 100%
    await expect(screenFrame.locator('#title')).toHaveText("d' = 100%");

    // Perfect score → N increases from 1 to 2
    await expect(screenFrame.locator('#level')).toHaveText('N = 2');
  });

  test('game with no input results in all misses', async ({ page }) => {
    await page.goto('/');

    const screenFrame = page.frameLocator('#thescreen');
    await screenFrame.locator('[id="#gear"]').waitFor({ state: 'attached' });

    await page.locator('div[id="#play"] g').click();
    await screenFrame.locator('#vis_button').waitFor({ state: 'visible' });
    await page.waitForFunction(() => window.myInterval > 0);

    const seqLength = await page.evaluate(() => window.vis_stack.length);

    // Advance through all timesteps without clicking anything
    for (let t = 0; t <= seqLength; t++) {
      await page.clock.runFor(3000);
    }

    // Verify score screen
    await screenFrame.locator('#vis_hits').waitFor({ state: 'attached' });

    await expect(screenFrame.locator('#vis_hits')).toHaveText('0');
    await expect(screenFrame.locator('#vis_misses')).toHaveText('6');
    await expect(screenFrame.locator('#vis_wrong')).toHaveText('0');
    await expect(screenFrame.locator('#letter_hits')).toHaveText('0');
    await expect(screenFrame.locator('#letter_misses')).toHaveText('6');
    await expect(screenFrame.locator('#letter_wrong')).toHaveText('0');

    // d' = 0 - 0 = 0 → displayed as 0%
    await expect(screenFrame.locator('#title')).toHaveText("d' = 0%");

    // d' < 0.7 would decrease N, but min is 1 so it stays at 1
    await expect(screenFrame.locator('#level')).toHaveText('N = 1');
  });
});
