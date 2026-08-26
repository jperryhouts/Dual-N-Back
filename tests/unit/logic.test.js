import { describe, test, expect } from 'vitest';
import { loadLogic } from './load-logic.js';

const ctx = loadLogic();

describe('getRandomNumbers', () => {
  const { getRandomNumbers } = ctx;

  test('returns the requested count of numbers', () => {
    expect(getRandomNumbers(0, 10, 5)).toHaveLength(5);
    expect(getRandomNumbers(0, 10, 0)).toHaveLength(0);
    expect(getRandomNumbers(0, 10, 100)).toHaveLength(100);
  });

  test('values are within [start, stop) range', () => {
    const nums = getRandomNumbers(3, 7, 200);
    for (const n of nums) {
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThan(7);
    }
  });
});

describe('buildGameSequence', () => {
  test('produces correct length and exactly 6 matches for N=1', () => {
    ctx.N = 1;
    ctx.N_plus = 20;
    const [visStack, audStack] = ctx.buildGameSequence();

    expect(visStack).toHaveLength(21); // N + N_plus
    expect(audStack).toHaveLength(21);

    // Count matches: position i matches position i-N
    let visMatches = 0;
    let audMatches = 0;
    for (let i = ctx.N; i < visStack.length; i++) {
      if (visStack[i] === visStack[i - ctx.N]) visMatches++;
      if (audStack[i] === audStack[i - ctx.N]) audMatches++;
    }

    expect(visMatches).toBe(6);
    expect(audMatches).toBe(6);
  });

  test('produces correct length and exactly 6 matches for N=3', () => {
    ctx.N = 3;
    ctx.N_plus = 20;
    const [visStack, audStack] = ctx.buildGameSequence();

    expect(visStack).toHaveLength(23); // N + N_plus
    expect(audStack).toHaveLength(23);

    let visMatches = 0;
    let audMatches = 0;
    for (let i = ctx.N; i < visStack.length; i++) {
      if (visStack[i] === visStack[i - ctx.N]) visMatches++;
      if (audStack[i] === audStack[i - ctx.N]) audMatches++;
    }

    expect(visMatches).toBe(6);
    expect(audMatches).toBe(6);
  });

  test('visual values are in range [0,8) and audio values in [0,10)', () => {
    ctx.N = 2;
    ctx.N_plus = 20;
    const [visStack, audStack] = ctx.buildGameSequence();

    for (const v of visStack) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(8);
    }
    for (const a of audStack) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(10);
    }
  });
});

describe('calculateScore', () => {
  // Build a deterministic N=2 game: 22 stimuli per channel, exactly 6 targets
  // each, with the targets at known indices.
  function setupGame(ctx) {
    const N = 2;
    ctx.N = N;
    ctx.N_plus = 20;

    // Non-repeating base, then force matches at chosen indices.
    const vis = [];
    const letter = [];
    for (let i = 0; i < 20 + N; i++) {
      vis.push(i % 8);
      letter.push(i % 10);
    }
    const visTargets = [2, 5, 8, 11, 14, 17];
    const letterTargets = [3, 6, 9, 12, 15, 18];
    for (const i of visTargets) vis[i] = vis[i - N];
    for (const i of letterTargets) letter[i] = letter[i - N];

    // Guard: the construction must yield exactly 6 real targets per channel.
    let v = 0, l = 0;
    for (let i = N; i < vis.length; i++) {
      if (vis[i] === vis[i - N]) v++;
      if (letter[i] === letter[i - N]) l++;
    }
    expect(v).toBe(6);
    expect(l).toBe(6);

    ctx.vis_stack = vis;
    ctx.letter_stack = letter;
    ctx.vis_clicks = [];
    ctx.letter_clicks = [];
    return { N, visTargets, letterTargets };
  }

  test('perfect play scores 1.0 and levels up', () => {
    const ctx = loadLogic();
    const { visTargets, letterTargets } = setupGame(ctx);
    ctx.vis_clicks = [...visTargets];
    ctx.letter_clicks = [...letterTargets];

    expect(ctx.calculateScore()).toBe(1);
    expect(ctx.sensitivity).toBeCloseTo(1.0, 10);
    expect(ctx.vis_hits).toBe(6);
    expect(ctx.vis_wrong).toBe(0);
  });

  test('doing nothing scores 0 and levels down', () => {
    const ctx = loadLogic();
    setupGame(ctx);

    expect(ctx.calculateScore()).toBe(-1);
    expect(ctx.sensitivity).toBeCloseTo(0.0, 10);
    expect(ctx.vis_misses).toBe(6);
  });

  test('pressing everything scores 0 — hits are cancelled by false alarms', () => {
    const ctx = loadLogic();
    setupGame(ctx);
    const all = ctx.vis_stack.map((_, i) => i);
    ctx.vis_clicks = [...all];
    ctx.letter_clicks = [...all];

    expect(ctx.calculateScore()).toBe(-1);
    expect(ctx.sensitivity).toBeCloseTo(0.0, 10);
    // Every non-target press counts, including the first N trials.
    expect(ctx.vis_wrong).toBe(ctx.vis_stack.length - 6);
  });

  // Regression: trials before index N have no i-N predecessor, so they can
  // never be targets, but they ARE non-targets and a press there is a false
  // alarm. Scoring used to start at i=N and silently drop these.
  test('counts false alarms during the first N timesteps', () => {
    const ctx = loadLogic();
    const { N } = setupGame(ctx);
    ctx.vis_clicks = [0];      // before index N — cannot be a target
    ctx.letter_clicks = [N - 1];

    ctx.calculateScore();

    expect(ctx.vis_wrong).toBe(1);
    expect(ctx.letter_wrong).toBe(1);
    expect(ctx.vis_hits).toBe(0);
    expect(ctx.sensitivity).toBeLessThan(0);
  });

  test('false alarm numerator and denominator span the same trials', () => {
    const ctx = loadLogic();
    setupGame(ctx);
    // Press on every non-target, and on nothing else.
    const nonTargets = ctx.vis_stack
      .map((_, i) => i)
      .filter((i) => !(i >= ctx.N && ctx.vis_stack[i] === ctx.vis_stack[i - ctx.N]));
    ctx.vis_clicks = nonTargets;

    ctx.calculateScore();

    // Denominator is vis_stack.length - 6, so a press on every non-target must
    // yield exactly that count — i.e. a false alarm rate of exactly 1.0.
    expect(nonTargets.length).toBe(ctx.vis_stack.length - 6);
    expect(ctx.vis_wrong).toBe(ctx.vis_stack.length - 6);
  });
});
