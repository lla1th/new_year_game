import { describe, test, expect } from 'vitest';
import { L02 } from '../../src/game/levels/L02';
import { L03 } from '../../src/game/levels/L03';
import { harness, checkLevelData } from './harness';

describe('L02 «Ярмарка»', () => {
  test('full walkthrough with the optional snowman', async () => {
    const h = harness(L02);
    const { state, log } = h;
    state.addItem('ITEM_MANDARIN');   // carried from L01
    await h.enter();
    expect(log).toContain('cutscene:l02_tease');
    await h.click('stall_left'); await h.click('stall_left'); expect(h.count('ITEM_BULB_GREEN')).toBe(1);
    // mandarin on the snowman BEFORE taking his nose → wrong item
    log.length = 0;
    await h.use('snowman', 'ITEM_MANDARIN');
    expect(log).toEqual(['say:ksyusha:common.wrongItem.1']);
    expect(state.hasItem('ITEM_MANDARIN')).toBe(true);
    await h.click('snowman'); expect(state.hasFlag('L02_SNOWMAN_SAD')).toBe(true); expect(state.hasItem('ITEM_BULB_GOLD')).toBe(true);
    await h.click('snowman'); expect(h.count('ITEM_BULB_GOLD')).toBe(1);
    await h.click('carousel'); expect(state.hasFlag('L02_CAROUSEL_SPUN')).toBe(true);
    await h.click('bulb_blue'); expect(state.hasItem('ITEM_BULB_BLUE')).toBe(true);
    await h.use('snowman', 'ITEM_MANDARIN'); expect(state.hasFlag('L02_SNOWMAN_HAPPY')).toBe(true); expect(state.hasItem('ITEM_MANDARIN')).toBe(false);
    expect(log).toContain('say:ksyusha:l02.snowman.happy');
    // the screen consumes the bulbs while they are inserted (GarlandScreen); here: simulate
    for (const b of ['ITEM_BULB_GREEN', 'ITEM_BULB_GOLD', 'ITEM_BULB_BLUE'] as const) state.removeItem(b);
    log.length = 0;
    await h.click('garland');                     // puzzle → true
    expect(state.hasFlag('L02_GARLAND_DONE')).toBe(true); expect(state.hasItem('ITEM_GATE_KEY')).toBe(true); expect(state.hasItem('ITEM_COCOA')).toBe(true);
    expect(log).toContain('dialog:l02_nika');
    expect(log).toContain('checkpoint');
    expect(log.indexOf('checkpoint')).toBeGreaterThan(log.indexOf('dialog:l02_nika'));
    log.length = 0;
    await h.click('gate'); expect(log.some(l => l.startsWith('goto'))).toBe(false);   // locked: only the inspect line
    await h.use('gate', 'ITEM_GATE_KEY'); expect(state.hasFlag('L02_GATE_OPEN')).toBe(true); expect(state.hasItem('ITEM_GATE_KEY')).toBe(false);
    await h.click('gate'); expect(log).toContain('goto:L03:');
  });

  test('taking a bulb works once even after it went into the garland', async () => {
    const h = harness(L02);
    await h.click('stall_left');
    h.state.removeItem('ITEM_BULB_GREEN');      // inserted into the garland
    await h.click('stall_left');
    expect(h.count('ITEM_BULB_GREEN')).toBe(0);
    await h.click('carousel'); await h.click('bulb_blue');
    h.state.removeItem('ITEM_BULB_BLUE');
    await h.click('bulb_blue');
    expect(h.count('ITEM_BULB_BLUE')).toBe(0);
  });

  test('garland closed without solving: no reward, no flag', async () => {
    const h = harness(L02, { puzzles: { 'P-02': false } });
    await h.click('garland');
    expect(h.state.hasFlag('L02_GARLAND_DONE')).toBe(false);
    expect(h.state.hasItem('ITEM_GATE_KEY')).toBe(false);
  });

  test('without the snowman task the level is still completed', async () => {
    const h = harness(L02);
    await h.click('garland');
    await h.use('gate', 'ITEM_GATE_KEY');
    await h.click('gate');
    expect(h.log).toContain('goto:L03:');
  });

  test('Nika after the garland: talk; tease cutscene not replayed after the checkpoint', async () => {
    const h = harness(L02);
    await h.click('garland');
    h.log.length = 0;
    await h.click('nika_frozen');
    expect(h.log).toEqual(['say:nika:l02.nika.after']);
    h.log.length = 0;
    await h.enter();
    expect(h.log).not.toContain('cutscene:l02_tease');
  });

  test('L02 → L03: unused mandarin is removed, cocoa stays', async () => {
    const h3 = harness(L03);
    h3.state.addItem('ITEM_MANDARIN'); h3.state.addItem('ITEM_COCOA');
    await h3.enter('square');
    expect(h3.state.hasItem('ITEM_MANDARIN')).toBe(false);
    expect(h3.state.hasItem('ITEM_COCOA')).toBe(true);
  });

  test('data: map, texts, dialogs, hints', () => {
    checkLevelData(L02, expect as never);
  });
});
