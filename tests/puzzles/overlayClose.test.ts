import { describe, test, expect } from 'vitest';
import { closeResult, openShortcut } from '../../src/game/scenes/overlayClose';
import { createGarland, insertBulb } from '../../src/puzzles/logic/garland';
import { completeGarland } from '../../src/puzzles/logic/garland';

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

  test('garland: completing it wrongly returns the wrong bulbs at once (closing during the blink loses nothing)', () => {
    let s = createGarland();
    s = insertBulb(insertBulb(insertBulb(s, 1, 'blue')!, 2, 'gold')!, 4, 'green')!;
    const r = completeGarland(s);
    expect(r.result).toBe('wrong');
    expect(r.state.sockets).toEqual(['red', null, 'gold', 'red', null]);   // reopening shows only the right ones
    expect(r.returned.sort()).toEqual(['blue', 'green']);
    expect(r.wrongIdx).toEqual([1, 4]);
    const ok = completeGarland(insertBulb(insertBulb(insertBulb(createGarland(), 1, 'green')!, 2, 'gold')!, 4, 'blue')!);
    expect(ok.result).toBe('solved');
    expect(ok.state.solved).toBe(true);
    expect(completeGarland(insertBulb(createGarland(), 1, 'green')!).result).toBe('incomplete');
  });
});
