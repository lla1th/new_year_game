import { describe, test, expect } from 'vitest';
import {
  BULB_ITEM, bulbsComplete, createGenerator, ejectBulbs, insertBulb, pourFuel, pullCord, type BulbColor,
} from '../../src/puzzles/logic/generator';

const COLORS: BulbColor[] = ['red', 'yellow', 'blue'];
const withAllBulbs = () => COLORS.reduce((s, c) => insertBulb(s, c, c).state, createGenerator());

describe('P-02 generator', () => {
  test('constants', () => {
    expect(BULB_ITEM).toEqual({ red: 'ITEM_BULB_RED', yellow: 'ITEM_BULB_YELLOW', blue: 'ITEM_BULB_BLUE' });
  });

  test('a bulb goes only into the socket of its own colour', () => {
    const s = createGenerator();
    const wrong = insertBulb(s, 'yellow', 'red');
    expect(wrong.result).toBe('wrong');
    expect(wrong.state).toEqual(s);
    const ok = insertBulb(s, 'red', 'red');
    expect(ok.result).toBe('ok');
    expect(ok.state.sockets.red).toBe(true);
    expect(insertBulb(ok.state, 'red', 'red').result).toBe('occupied');
  });

  test('the cord without bulbs, without fuel or without both only sputters and changes nothing', () => {
    const empty = createGenerator();
    expect(pullCord(empty)).toEqual({ state: empty, result: 'sputter' });
    const noFuel = withAllBulbs();
    expect(pullCord(noFuel)).toEqual({ state: noFuel, result: 'sputter' });
    const noBulbs = pourFuel(createGenerator()).state;
    expect(pullCord(noBulbs)).toEqual({ state: noBulbs, result: 'sputter' });
    const twoBulbs = pourFuel(insertBulb(insertBulb(createGenerator(), 'red', 'red').state, 'blue', 'blue').state).state;
    expect(pullCord(twoBulbs).result).toBe('sputter');
  });

  test('the order «bulbs → fuel» and «fuel → bulbs» both start the generator', () => {
    const a = pullCord(pourFuel(withAllBulbs()).state);
    expect(a.result).toBe('on'); expect(a.state.on).toBe(true);
    const b = COLORS.reduce((s, c) => insertBulb(s, c, c).state, pourFuel(createGenerator()).state);
    expect(pullCord(b).result).toBe('on');
  });

  test('fuel goes in once; a started generator is locked', () => {
    const f = pourFuel(createGenerator());
    expect(f.result).toBe('ok');
    expect(pourFuel(f.state).result).toBe('already');
    const on = pullCord(pourFuel(withAllBulbs()).state).state;
    expect(pullCord(on).result).toBe('locked');
    expect(pourFuel(on).result).toBe('locked');
    expect(insertBulb(on, 'red', 'red').result).toBe('locked');
  });

  test('ejectBulbs returns inserted bulbs unless all three are in', () => {
    const two = insertBulb(insertBulb(createGenerator(), 'red', 'red').state, 'blue', 'blue').state;
    const r = ejectBulbs(two);
    expect(r.returned.sort()).toEqual(['blue', 'red']);
    expect(bulbsComplete(r.state)).toBe(false);
    expect(r.state.sockets).toEqual({ red: false, yellow: false, blue: false });
    const full = withAllBulbs();
    expect(ejectBulbs(full)).toEqual({ state: full, returned: [] });
  });

  test('state is restored from saved flags', () => {
    const s = createGenerator({ bulbs: true, fueled: true });
    expect(bulbsComplete(s)).toBe(true);
    expect(s.fueled).toBe(true);
    expect(pullCord(s).result).toBe('on');
  });
});
