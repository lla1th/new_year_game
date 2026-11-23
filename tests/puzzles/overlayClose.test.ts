import { describe, test, expect } from 'vitest';
import { closeResult, openShortcut } from '../../src/game/scenes/overlayClose';
import { createGenerator, ejectBulbs, insertBulb } from '../../src/puzzles/logic/generator';

describe('closing an overlay screen', () => {
  test('closing (✕ / background) right after the puzzle was solved still counts as solved', () => {
    expect(closeResult(false, { isSolved: () => true })).toBe(true);
    expect(closeResult(false, { isSolved: () => false })).toBe(false);
    expect(closeResult(true, { isSolved: () => false })).toBe(true);
  });

  test('reopening an already solved screen resolves at once (no soft-lock)', () => {
    expect(openShortcut({ isSolved: () => true })).toBe(true);
    expect(openShortcut({ isSolved: () => false })).toBe(false);
  });

  test('generator: closing before all bulbs are in returns them (a save can never lose a bulb)', () => {
    let s = createGenerator();
    s = insertBulb(insertBulb(s, 'red', 'red').state, 'blue', 'blue').state;
    const r = ejectBulbs(s);
    expect(r.returned.sort()).toEqual(['blue', 'red']);
    expect(r.state.sockets).toEqual({ red: false, yellow: false, blue: false });
  });
});
