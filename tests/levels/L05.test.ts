import { describe, test, expect } from 'vitest';
import { L05 } from '../../src/game/levels/L05';
import { harness, checkLevelData } from './harness';

describe('L05 «Морозильный склад»', () => {
  test('with mittens: enter, P-05, Gear, mittens removed, on to L06', async () => {
    const h = harness(L05);
    const { state, log } = h;
    state.addPart('PART_SPRING');
    state.addItem('ITEM_MITTENS');
    await h.enter(); expect(state.hasFlag('L05_ENTERED')).toBe(true);
    await h.click('ice_floor');
    expect(state.parts).toContain('PART_GEAR'); expect(state.parts).toHaveLength(2);   // indicator 2/3
    expect(state.hasItem('ITEM_MITTENS')).toBe(false);
    expect(state.hasFlag('L05_CRATES_DONE')).toBe(true);
    expect(log).toContain('cutscene:l05_cat');
    expect(log).toContain('goto:L06:');
  });

  test('without mittens: line and back to L04', async () => {
    const h = harness(L05);
    await h.enter();
    expect(h.state.hasFlag('L05_ENTERED')).toBe(false);
    expect(h.log).toEqual(['say:ksyusha:l05.no_mittens', 'goto:L04:']);
  });

  test('P-05 closed without solving: nothing happens', async () => {
    const h = harness(L05, { puzzles: { 'P-05': false } });
    h.state.addItem('ITEM_MITTENS');
    await h.click('ice_floor');
    expect(h.state.parts).toEqual([]);
    expect(h.state.hasItem('ITEM_MITTENS')).toBe(true);
  });

  test('Continue after the checkpoint (crates done) goes on to L06', async () => {
    const h = harness(L05);
    h.state.setFlag('L05_CRATES_DONE');
    await h.enter();
    expect(h.log).toEqual(['goto:L06:']);
  });

  test('data: map, texts, dialogs, hints', () => {
    checkLevelData(L05, expect as never);
  });
});
