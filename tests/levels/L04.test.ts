import { describe, test, expect } from 'vitest';
import { L04 } from '../../src/game/levels/L04';
import { harness, checkLevelData } from './harness';

describe('L04 «Пряничный цех»', () => {
  test('walkthrough: cane → valve → tank → P-04 → mittens → freezer door', async () => {
    const h = harness(L04);
    const { state, log } = h;
    await h.enter();
    expect(log).toContain('dialog:l04_lekha_intro');
    await h.click('candy_jar'); await h.click('candy_jar'); expect(h.count('ITEM_CANDY_CANE')).toBe(1);
    await h.click('tank'); expect(log).not.toContain('puzzle:P-04');           // no valve yet
    await h.click('ginger'); expect(log).toContain('say:ginger:l04.ginger.talk');
    await h.use('ginger', 'ITEM_CANDY_CANE');
    expect(state.hasItem('ITEM_VALVE')).toBe(true); expect(state.hasItem('ITEM_CANDY_CANE')).toBe(false);
    expect(state.hasFlag('L04_VALVE_TAKEN')).toBe(true);
    await h.click('candy_jar'); expect(h.count('ITEM_CANDY_CANE')).toBe(0);    // the cane is not taken again
    await h.use('tank', 'ITEM_VALVE'); expect(state.hasFlag('L04_VALVE_INSTALLED')).toBe(true); expect(state.hasItem('ITEM_VALVE')).toBe(false);
    await h.click('tank');
    expect(state.hasFlag('L04_PIPES_DONE')).toBe(true); expect(state.hasItem('ITEM_MITTENS')).toBe(true);
    expect(log).toContain('dialog:l04_lekha_done');
    expect(log.lastIndexOf('checkpoint')).toBeGreaterThan(log.indexOf('dialog:l04_lekha_done'));
    await h.click('freezer_door'); expect(log).toContain('goto:L05:');
  });

  test('P-04 closed without solving: no mittens', async () => {
    const h = harness(L04, { puzzles: { 'P-04': false } });
    h.state.setFlag('L04_VALVE_INSTALLED');
    await h.click('tank');
    expect(h.state.hasFlag('L04_PIPES_DONE')).toBe(false);
    expect(h.state.hasItem('ITEM_MITTENS')).toBe(false);
  });

  test('Continue after P-04: the intro dialog is not replayed; Lekha has new lines', async () => {
    const h = harness(L04);
    h.state.setFlag('L04_PIPES_DONE');
    await h.enter();
    expect(h.log).not.toContain('dialog:l04_lekha_intro');
    await h.click('lekha');
    expect(h.log).toContain('say:lekha:l04.lekha.after');
  });

  test('data: map, texts, dialogs, hints', () => {
    checkLevelData(L04, expect as never);
  });
});
