import { describe, test, expect } from 'vitest';
import { L08 } from '../../src/game/levels/L08';
import { fitsSlot } from '../../src/puzzles/logic/clock';
import { harness, checkLevelData } from './harness';

describe('L08 «Полночь» and the ending', () => {
  test('a part fits only its own silhouette', () => {
    expect(fitsSlot('PART_GEAR', 'PART_GEAR')).toBe(true);
    expect(fitsSlot('PART_GEAR', 'PART_SPRING')).toBe(false);
    expect(fitsSlot('PART_HANDS', 'PART_SPRING')).toBe(false);
  });

  test('snail, clock, midnight, gift, ending', async () => {
    const h = harness(L08);
    const { state, log } = h;
    for (const p of ['PART_SPRING', 'PART_GEAR', 'PART_HANDS'] as const) state.addPart(p);
    await h.enter(); expect(log).toContain('dialog:l08_snail');
    await h.click('clock');                 // ClockScreen → true (all 3 inserted)
    expect(state.hasFlag('L08_PARTS_INSERTED')).toBe(true); expect(state.parts).toEqual([]); expect(log).toContain('cutscene:midnight');
    await h.click('gift_box');              // P-08 → true
    expect(state.hasFlag('L08_GIFT_OPENED')).toBe(true); expect(state.hasFlag('GAME_COMPLETED')).toBe(true);
    expect(state.completed).toBe(true);
    const cp = log.lastIndexOf('checkpoint');
    expect(cp).toBeGreaterThan(log.indexOf('puzzle:P-08'));
    expect(log.indexOf('cutscene:ending')).toBeGreaterThan(cp);   // saved before the card: closing the tab on the credits keeps the level select
    expect(log).toContain('goto:L08:post');
    await h.enter('post');
    expect(h.log.slice(-2)).toEqual(['say:ksyusha:l08.post.ksy', 'cutscene:to_menu']);
  });

  test('clock closed before all parts are in: no midnight', async () => {
    const h = harness(L08, { puzzles: { clock: false } });
    h.state.addPart('PART_GEAR');
    await h.click('clock');
    expect(h.state.hasFlag('L08_PARTS_INSERTED')).toBe(false);
    expect(h.log).not.toContain('cutscene:midnight');
  });

  test('Continue: after the parts — no snail dialog; after the gift — straight to the ending', async () => {
    const h = harness(L08);
    h.state.setFlag('L08_PARTS_INSERTED');
    await h.enter();
    expect(h.log).not.toContain('dialog:l08_snail');
    const g = harness(L08);
    g.state.setFlag('L08_PARTS_INSERTED'); g.state.setFlag('L08_GIFT_OPENED');
    await g.enter();
    expect(g.log).toEqual(['cutscene:ending', 'goto:L08:post']);
  });

  test('data: maps, texts, dialogs, hints', () => {
    checkLevelData(L08, expect as never);
  });
});
