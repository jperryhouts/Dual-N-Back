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
