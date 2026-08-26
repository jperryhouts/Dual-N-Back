const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const howlerMock = fs.readFileSync(
  path.join(__dirname, '../fixtures/howler-mock.js'),
  'utf-8'
);

// The two on-screen buttons are vis_button (left, eye) and letter_button (right, speaker).
// Keys are grouped in per-hand PAIRS so the whole game is playable with one hand:
//   a / ;   either hand (original layout)
//   d / f   left hand only
//   j / k   right hand only
// Each pair must straddle both buttons — that is the property these tests protect.
const VISUAL_KEYS = ['a', 'd', 'j'];
const AUDIO_KEYS = [';', 'f', 'k'];

const HAND_PAIRS = [
  { hand: 'either hand', visual: 'a', audio: ';' },
  { hand: 'left hand', visual: 'd', audio: 'f' },
  { hand: 'right hand', visual: 'j', audio: 'k' },
];

test.describe('Keyboard shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/howler*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: howlerMock,
      });
    });

    await page.clock.install();
  });

  /** Start a game and advance to the first timestep so `time` is 1. */
  async function startGame(page) {
    await page.goto('/');

    const screenFrame = page.frameLocator('#thescreen');
    await screenFrame.locator('[id="#gear"]').waitFor({ state: 'attached' });
    await page.locator('div[id="#play"] g').click();
    await screenFrame.locator('#vis_button').waitFor({ state: 'visible' });
    await page.waitForFunction(() => window.myInterval > 0);

    // Fire one timestep so a keypress records a real (time-1) index.
    await page.clock.runFor(3000);

    return screenFrame;
  }

  const clicks = (page) =>
    page.evaluate(() => ({
      vis: window.vis_clicks.slice(),
      letter: window.letter_clicks.slice(),
    }));

  for (const key of VISUAL_KEYS) {
    test(`'${key}' registers a visual match and not an audio one`, async ({ page }) => {
      await startGame(page);

      expect(await clicks(page)).toEqual({ vis: [], letter: [] });

      await page.keyboard.press(key);

      const after = await clicks(page);
      expect(after.vis).toEqual([0]);
      expect(after.letter).toEqual([]);
    });
  }

  for (const key of AUDIO_KEYS) {
    test(`'${key}' registers an audio match and not a visual one`, async ({ page }) => {
      await startGame(page);

      expect(await clicks(page)).toEqual({ vis: [], letter: [] });

      await page.keyboard.press(key);

      const after = await clicks(page);
      expect(after.letter).toEqual([0]);
      expect(after.vis).toEqual([]);
    });
  }

  // Guards the single-handed-play property: if someone regroups the keys so that
  // both halves of a pair drive the same button, that hand can no longer play.
  for (const { hand, visual, audio } of HAND_PAIRS) {
    test(`${visual}/${audio} covers both buttons (${hand} play)`, async ({ page }) => {
      await startGame(page);

      await page.keyboard.press(visual);
      await page.keyboard.press(audio);

      const after = await clicks(page);
      expect(after.vis).toEqual([0]);
      expect(after.letter).toEqual([0]);
    });
  }

  test('keys work when focus is inside the game iframe', async ({ page }) => {
    const screenFrame = await startGame(page);

    // logic.js attaches the listener to the iframe's contentWindow too.
    await screenFrame.locator('#vis_button').click();
    await page.evaluate(() => {
      document.getElementById('thescreen').contentWindow.focus();
    });

    await page.keyboard.press('j');

    const after = await clicks(page);
    // One click + one keypress, both visual, both at timestep 0.
    expect(after.vis).toEqual([0, 0]);
    expect(after.letter).toEqual([]);
  });

  test('unrelated keys are ignored', async ({ page }) => {
    await startGame(page);

    for (const key of ['s', 'g', 'h', 'l', 'z', 'Enter']) {
      await page.keyboard.press(key);
    }

    expect(await clicks(page)).toEqual({ vis: [], letter: [] });
  });

  test('shortcuts are unbound after returning home', async ({ page }) => {
    const screenFrame = await startGame(page);

    // goto_home() clears the interval and (via hide_menu) removes the keydown
    // listeners. Note it does NOT reset myInterval, so wait on the home screen.
    await page.evaluate(() => window.goto_home());
    await screenFrame.locator('[id="#gear"]').waitFor({ state: 'attached' });

    const before = await clicks(page);
    await page.keyboard.press('a');
    await page.keyboard.press(';');

    expect(await clicks(page)).toEqual(before);
  });
});
