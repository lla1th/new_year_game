import { describe, test, expect } from 'vitest';
import { SOLVED, isSolved, canMove, moveTile, isSolvable, shuffleBoard, solveBoard, HELP_DELAY_MS, HelpTimer } from '../../src/puzzles/logic/fifteen';

/** Deterministic RNG (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('P-08 fifteen (3×3)', () => {
  test('moves', () => {
    expect(SOLVED).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    expect(isSolved(SOLVED)).toBe(true);
    expect(canMove(SOLVED, 7)).toBe(true); expect(canMove(SOLVED, 5)).toBe(true);
    expect(canMove(SOLVED, 0)).toBe(false); expect(canMove(SOLVED, 4)).toBe(false); expect(canMove(SOLVED, 8)).toBe(false);
    expect(moveTile(SOLVED, 7)).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]);
    expect(moveTile(SOLVED, 0)).toBe(SOLVED);
    // no wrap-around between rows: index 6 (row 2, col 0) is not next to index 5 (row 1, col 2)
    expect(canMove([1, 2, 3, 4, 5, 0, 7, 8, 6], 6)).toBe(false);
  });

  test('solvability by inversion parity', () => {
    expect(isSolvable(SOLVED)).toBe(true);
    expect(isSolvable([1, 2, 3, 4, 5, 6, 8, 7, 0])).toBe(false);
  });

  test('2. 100 shuffles: all solvable and not solved', () => {
    for (let i = 0; i < 100; i++) {
      const b = shuffleBoard(seeded(i));
      expect(b).toHaveLength(9);
      expect([...b].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      expect(isSolvable(b)).toBe(true);
      expect(isSolved(b)).toBe(false);
    }
  });

  test('3. auto-solve reaches the solved board (several boards)', () => {
    for (const seed of [42, 1, 7, 99, 123]) {
      const b = shuffleBoard(seeded(seed));
      const moves = solveBoard(b);
      expect(isSolved(moves.reduce(moveTile, b))).toBe(true);
      for (let i = 0, cur = b; i < moves.length; i++) { expect(canMove(cur, moves[i])).toBe(true); cur = moveTile(cur, moves[i]); }
    }
    expect(solveBoard(SOLVED)).toEqual([]);
  });

  test('help timer: offer after 5 min; "Сама!" restarts the count; reshuffle does not touch it', () => {
    expect(HELP_DELAY_MS).toBe(300_000);
    let t = 0; const h = new HelpTimer(() => t);
    t = 299_999; expect(h.shouldOffer()).toBe(false); t = 300_000; expect(h.shouldOffer()).toBe(true);
    expect(h.shouldOffer()).toBe(false);                          // waiting for the answer
    h.decline(); t = 599_999; expect(h.shouldOffer()).toBe(false); t = 600_000; expect(h.shouldOffer()).toBe(true);
  });

  test('help timer with a custom delay (debug helpMs)', () => {
    let t = 0; const h = new HelpTimer(() => t, 3000);
    t = 3000; expect(h.shouldOffer()).toBe(true);
  });
});

test('an offer interrupted by closing the screen comes back on reopening', () => {
  let t = 0; const h = new HelpTimer(() => t);
  t = 300_000; expect(h.shouldOffer()).toBe(true);     // «Помочь?» shown, then the screen is closed without an answer
  t = 400_000; h.reopen();
  expect(h.shouldOffer()).toBe(true);                   // offered again at once
  h.decline(); h.reopen();                              // an answered offer is not repeated early
  t = 400_001; expect(h.shouldOffer()).toBe(false);
});
