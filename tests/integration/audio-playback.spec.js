const { test, expect } = require('@playwright/test');

const LETTERS = ["B", "C", "D", "G", "H", "K", "P", "Q", "T", "W"];

// Number of 3-second timesteps to observe (~10 seconds of real gameplay)
const NUM_STEPS = 3;

// Sprite definitions from logic.js: [offsetMs, durationMs]
// Each is 1000*n - 100 for offset, 850ms duration
const SPRITE_DEFS = {
  B: [900, 850],  C: [1900, 850], D: [2900, 850], G: [3900, 850], H: [4900, 850],
  K: [5900, 850], P: [6900, 850], Q: [7900, 850], T: [8900, 850], W: [9900, 850],
};

// Normalized cross-correlation between two envelopes.
// Returns a value between -1 and 1; >0.8 indicates a strong match.
function correlation(a, b) {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let sumAB = 0, sumA2 = 0, sumB2 = 0;
  for (let i = 0; i < n; i++) {
    sumAB += a[i] * b[i];
    sumA2 += a[i] * a[i];
    sumB2 += b[i] * b[i];
  }
  if (sumA2 === 0 || sumB2 === 0) return 0;
  return sumAB / (Math.sqrt(sumA2) * Math.sqrt(sumB2));
}

// Find the best correlation allowing a time shift (0–12 bins = 0–240ms)
// to account for ScriptProcessorNode buffer alignment latency (~120-180ms).
function bestCorrelation(captured, reference) {
  let best = -1;
  for (let shift = 0; shift <= 12; shift++) {
    const corr = correlation(captured.slice(shift), reference);
    if (corr > best) best = corr;
  }
  return best;
}

test.describe('Audio playback verification', () => {
  // No Howler mock — real library loads and drives the Web Audio API.
  // No fake timers — real setInterval so AudioContext works naturally.

  test('correct audio sprites play at the correct times', async ({ page }) => {
    await page.goto('/');

    const screenFrame = page.frameLocator('#thescreen');
    await screenFrame.locator('[id="#gear"]').waitFor({ state: 'attached' });

    // Click play (in parent frame) to start the game
    await page.locator('div[id="#play"] g').click();

    // Wait for game screen + audio priming + setInterval registration.
    // primeAudioEngine() exercises the full Howler pipeline (load audio file,
    // decode AudioBuffer, play sprite, receive 'end' event) before resolving.
    await screenFrame.locator('#vis_button').waitFor({ state: 'visible' });
    await page.waitForFunction(() => window.myInterval > 0);

    // Read the generated letter sequence so we know what to expect
    const letterStack = await page.evaluate(() => window.letter_stack);

    // Inject a spy on playLetter() — the function that bridges game logic
    // and Howler. It's a top-level function declaration so it's on `window`.
    // (The `sprites` Howl object is `let`-scoped and not directly accessible.)
    // The original playLetter still runs, so real Howler playback happens.
    await page.evaluate(() => {
      window._audioLog = [];
      const LETTERS = ["B", "C", "D", "G", "H", "K", "P", "Q", "T", "W"];
      const origPlayLetter = window.playLetter;
      window.playLetter = (idx) => {
        window._audioLog.push({ sprite: LETTERS[idx], time: performance.now() });
        return origPlayLetter(idx);
      };
    });

    // Wait for the expected number of plays
    await page.waitForFunction(
      (n) => window._audioLog.length >= n,
      NUM_STEPS,
      { timeout: 15000 }
    );

    const audioLog = await page.evaluate(() => window._audioLog);

    // --- Verify sprite names match the generated sequence ---
    expect(audioLog).toHaveLength(NUM_STEPS);
    for (let i = 0; i < NUM_STEPS; i++) {
      const expected = LETTERS[letterStack[i]];
      expect(audioLog[i].sprite, `timestep ${i}`).toBe(expected);
    }

    // --- Verify timing: intervals should be ~3000ms (±500ms for real-timer jitter) ---
    for (let i = 1; i < NUM_STEPS; i++) {
      const interval = audioLog[i].time - audioLog[i - 1].time;
      expect(interval, `interval ${i-1}→${i}`).toBeGreaterThan(2500);
      expect(interval, `interval ${i-1}→${i}`).toBeLessThan(3500);
    }
  });

  test('captured audio output matches expected sprite waveforms', async ({ page }) => {
    await page.goto('/');

    const screenFrame = page.frameLocator('#thescreen');
    await screenFrame.locator('[id="#gear"]').waitFor({ state: 'attached' });
    await page.locator('div[id="#play"] g').click();
    await screenFrame.locator('#vis_button').waitFor({ state: 'visible' });
    await page.waitForFunction(() => window.myInterval > 0);

    // Verify AudioContext is active (not suspended by autoplay policy)
    const ctxState = await page.evaluate(() => Howler.ctx.state);
    expect(ctxState, 'AudioContext should be running after priming').toBe('running');

    const letterStack = await page.evaluate(() => window.letter_stack);

    // Tap a ScriptProcessorNode into Howler's audio graph to capture raw
    // PCM samples. The processor sits between masterGain and destination,
    // so it sees every sample that would reach the speakers.
    await page.evaluate(() => {
      const ctx = Howler.ctx;
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      window._captures = [];
      let activeCapture = null;

      processor.onaudioprocess = (e) => {
        if (activeCapture) {
          activeCapture.chunks.push(Array.from(e.inputBuffer.getChannelData(0)));
        }
      };

      // Connect in parallel with existing masterGain→destination path.
      // In headless mode there's no audible output, so doubling is harmless.
      Howler.masterGain.connect(processor);
      processor.connect(ctx.destination);

      const LETTERS = ["B", "C", "D", "G", "H", "K", "P", "Q", "T", "W"];
      const origPlayLetter = window.playLetter;
      window.playLetter = (idx) => {
        const capture = { letter: LETTERS[idx], chunks: [], sampleRate: ctx.sampleRate };
        activeCapture = capture;

        const result = origPlayLetter(idx);

        // Stop capture after 1.2s (sprite is 850ms + padding for tail)
        const ref = capture;
        setTimeout(() => {
          if (activeCapture === ref) activeCapture = null;
          window._captures.push(ref);
        }, 1200);

        return result;
      };
    });

    // Wait for all captures to finish
    await page.waitForFunction(
      (n) => window._captures.length >= n,
      NUM_STEPS,
      { timeout: 20000 }
    );

    // Compute RMS envelopes in-browser (avoids transferring ~50K samples per capture).
    // Each envelope bin = 20ms of audio → ~60 bins per 1.2s capture.
    const capturedEnvelopes = await page.evaluate(() => {
      const BIN_MS = 20;
      return window._captures.map(c => {
        const samples = c.chunks.flat();
        const binSize = Math.round(c.sampleRate * BIN_MS / 1000);
        const envelope = [];
        for (let i = 0; i < samples.length; i += binSize) {
          const bin = samples.slice(i, i + binSize);
          let sum = 0;
          for (let j = 0; j < bin.length; j++) sum += bin[j] * bin[j];
          envelope.push(Math.sqrt(sum / bin.length));
        }
        return { letter: c.letter, envelope, totalSamples: samples.length };
      });
    });

    // Extract reference envelopes directly from the source sprites file.
    // No external snapshot files needed — the audio file IS the source of truth.
    const referenceEnvelopes = await page.evaluate(async (spriteDefs) => {
      const resp = await fetch('/audio/sprites.mp3');
      const buf = await resp.arrayBuffer();
      const offlineCtx = new OfflineAudioContext(1, 44100, 44100);
      const audioBuf = await offlineCtx.decodeAudioData(buf);
      const pcm = audioBuf.getChannelData(0);
      const sr = audioBuf.sampleRate;
      const BIN_MS = 20;
      const binSize = Math.round(sr * BIN_MS / 1000);

      const result = {};
      for (const [letter, [offsetMs, durMs]] of Object.entries(spriteDefs)) {
        const start = Math.round(offsetMs / 1000 * sr);
        const count = Math.round(durMs / 1000 * sr);
        const slice = pcm.slice(start, start + count);
        const envelope = [];
        for (let i = 0; i < slice.length; i += binSize) {
          const bin = slice.slice(i, i + binSize);
          let sum = 0;
          for (let j = 0; j < bin.length; j++) sum += bin[j] * bin[j];
          envelope.push(Math.sqrt(sum / bin.length));
        }
        result[letter] = envelope;
      }
      return result;
    }, SPRITE_DEFS);

    // --- Verify each captured sprite ---
    for (let i = 0; i < NUM_STEPS; i++) {
      const captured = capturedEnvelopes[i];
      const expectedLetter = LETTERS[letterStack[i]];

      // Sanity: ScriptProcessorNode actually captured samples
      expect(captured.totalSamples,
        'ScriptProcessorNode should capture samples (may not work in this browser mode)'
      ).toBeGreaterThan(0);

      // 1. Audio is not silent
      const peak = Math.max(...captured.envelope);
      expect(peak, `"${expectedLetter}" should not be silent`).toBeGreaterThan(0.01);

      // 2. Audio starts within 300ms — accounts for ~120-180ms ScriptProcessor
      //    buffer alignment latency plus the sprite's natural onset time.
      //    If the onset is LATER than 300ms, audio is being cut off or delayed.
      const onsetBin = captured.envelope.findIndex(v => v > 0.005);
      expect(onsetBin, `"${expectedLetter}" audio should appear within 300ms`).toBeGreaterThanOrEqual(0);
      expect(onsetBin, `"${expectedLetter}" audio should appear within 300ms`).toBeLessThan(15);

      // 3. Audio has expected duration — at least 20 active bins (400ms) above noise floor.
      //    The sprite is 850ms but some tail bins fall below the noise threshold.
      const activeBins = captured.envelope.filter(v => v > 0.005).length;
      expect(activeBins, `"${expectedLetter}" should sustain for most of its 850ms duration`).toBeGreaterThan(20);

      // 4. Captured waveform correlates with the expected sprite from the source
      //    file. We check against the EXPECTED reference only — identity is already
      //    verified by the spy test. RMS envelopes can't distinguish spectrally
      //    similar letters (e.g. "P" /piː/ vs "T" /tiː/ have near-identical
      //    temporal profiles). This check catches issues like wrong audio file,
      //    broken decoder, or corrupted sprites.
      const refEnv = referenceEnvelopes[expectedLetter];
      const corr = bestCorrelation(captured.envelope, refEnv);
      expect(corr,
        `timestep ${i}: "${expectedLetter}" should correlate with source sprite (got ${corr.toFixed(3)})`
      ).toBeGreaterThan(0.8);
    }
  });
});
