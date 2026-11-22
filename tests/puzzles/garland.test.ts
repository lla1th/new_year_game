import { describe, test, expect } from 'vitest';
import { createGarland, insertBulb, removeBulb, checkGarland, ejectWrong, GARLAND_TARGET, BULB_ITEM } from '../../src/puzzles/logic/garland';

describe('P-02 garland', () => {
  test('constants from the spec', () => {
    expect(GARLAND_TARGET).toEqual(['red', 'green', 'gold', 'red', 'blue']);
    expect(BULB_ITEM).toEqual({ green: 'ITEM_BULB_GREEN', gold: 'ITEM_BULB_GOLD', blue: 'ITEM_BULB_BLUE' });
    const s = createGarland();
    expect(s.sockets).toEqual(['red', null, null, 'red', null]);
    expect(s.fixed).toEqual([true, false, false, true, false]);
    expect(s.solved).toBe(false);
  });

  test('scenario: correct placement; fixed and occupied sockets refuse', () => {
    let s = createGarland();
    expect(insertBulb(s, 0, 'green')).toBeNull();                         // fixed
    s = insertBulb(s, 1, 'green')!; expect(insertBulb(s, 1, 'gold')).toBeNull();   // occupied
    s = insertBulb(s, 2, 'gold')!; expect(checkGarland(s).complete).toBe(false);
    s = insertBulb(s, 4, 'blue')!; expect(checkGarland(s)).toEqual({ complete: true, solved: true, wrongIdx: [] });
  });

  test('scenario: green and blue swapped → both return, gold stays', () => {
    const w = insertBulb(insertBulb(insertBulb(createGarland(), 1, 'blue')!, 2, 'gold')!, 4, 'green')!;
    expect(checkGarland(w).wrongIdx).toEqual([1, 4]);
    const r = ejectWrong(w);
    expect(r.returned.sort()).toEqual(['blue', 'green']);
    expect(r.state.sockets).toEqual(['red', null, 'gold', 'red', null]);
    expect(r.state.solved).toBe(false);
  });

  test('scenario: insert and remove before filling → bulb returns', () => {
    const s = insertBulb(createGarland(), 2, 'blue')!;
    const r = removeBulb(s, 2);
    expect(r.color).toBe('blue');
    expect(r.state.sockets[2]).toBeNull();
    expect(removeBulb(createGarland(), 0).color).toBeNull();               // fixed one cannot be taken out
    expect(removeBulb(createGarland(), 1).color).toBeNull();               // empty
  });

  test('ejectWrong on a correct garland marks it solved; after solving nothing changes', () => {
    const ok = insertBulb(insertBulb(insertBulb(createGarland(), 1, 'green')!, 2, 'gold')!, 4, 'blue')!;
    const r = ejectWrong(ok);
    expect(r.returned).toEqual([]);
    expect(r.state.solved).toBe(true);
    expect(insertBulb(r.state, 1, 'gold')).toBeNull();
    expect(removeBulb(r.state, 1).color).toBeNull();
  });

  test('states are immutable', () => {
    const s = createGarland();
    insertBulb(s, 1, 'green');
    expect(s.sockets[1]).toBeNull();
  });

  test('bad index is refused', () => {
    expect(insertBulb(createGarland(), 7, 'green')).toBeNull();
    expect(removeBulb(createGarland(), -1).color).toBeNull();
  });
});
