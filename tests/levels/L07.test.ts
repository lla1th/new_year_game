import { describe, test, expect } from 'vitest';
import { L07 } from '../../src/game/levels/L07';
import { harness, checkLevelData } from './harness';

describe('L07 «Кошачья башня» / P-07', () => {
  test('1. drawing → friends → combine → gift: success', async () => {
    const h = harness(L07);
    const { state, log } = h;
    state.addPart('PART_SPRING'); state.addPart('PART_GEAR');
    await h.click('nika'); expect(state.hasItem('ITEM_RIBBON')).toBe(false); expect(log).toContain('say:nika:l07.nika.early');
    await h.click('lekha'); expect(state.hasItem('ITEM_GINGER_MEDAL')).toBe(false); expect(log).toContain('say:lekha:l07.lekha.early');
    await h.click('drawing'); expect(state.hasFlag('L07_DRAWING_FOUND')).toBe(true); expect(log).toContain('say:spitz:l07.dlg.spitz.1');
    expect(log).toContain('puzzle:drawing');
    await h.click('nika'); expect(state.hasItem('ITEM_RIBBON')).toBe(true); expect(state.hasFlag('L07_RIBBON_GIVEN')).toBe(true);
    await h.click('nika'); expect(h.count('ITEM_RIBBON')).toBe(1);   // not given twice
    await h.click('lekha'); expect(state.hasItem('ITEM_GINGER_MEDAL')).toBe(true); expect(state.hasFlag('L07_MEDAL_GIVEN')).toBe(true);
    // 3. the ribbon alone → refusal, it stays
    await h.use('cat', 'ITEM_RIBBON'); expect(state.hasItem('ITEM_RIBBON')).toBe(true); expect(log).toContain('say:cat:l07.cat.refuse');
    expect(log).toContain('anim:cat_turn');
    await h.use('cat', 'ITEM_GINGER_MEDAL'); expect(state.hasItem('ITEM_GINGER_MEDAL')).toBe(true);
    // 4. reverse order works the same
    h.combine('ITEM_GINGER_MEDAL', 'ITEM_RIBBON');
    expect(state.inventory).toEqual(['ITEM_KEEPER_MEDAL']);
    await h.use('cat', 'ITEM_KEEPER_MEDAL');
    expect(state.hasFlag('L07_CAT_RECONCILED')).toBe(true); expect(state.parts).toContain('PART_HANDS'); expect(state.parts).toHaveLength(3);
    expect(state.hasItem('ITEM_KEEPER_MEDAL')).toBe(false);
    expect(log).toContain('dialog:l07_reconcile'); expect(log).toContain('goto:L08:');
    expect(log.lastIndexOf('checkpoint')).toBeLessThan(log.indexOf('goto:L08:'));
  });

  test('other items on the cat → wrong item line', async () => {
    const h = harness(L07);
    await h.use('cat', 'ITEM_COCOA');
    expect(h.log).toEqual(['say:ksyusha:common.wrongItem.1']);
  });

  test('a wrong pair does not combine', () => {
    const h = harness(L07);
    h.state.addItem('ITEM_RIBBON'); h.state.addItem('ITEM_COCOA');
    h.combine('ITEM_RIBBON', 'ITEM_COCOA');
    expect(h.log).toEqual(['say:ksyusha:common.cantCombine']);
    expect(h.state.inventory).toEqual(['ITEM_RIBBON', 'ITEM_COCOA']);
  });

  test('Continue after reconciliation goes to L08', async () => {
    const h = harness(L07);
    h.state.setFlag('L07_CAT_RECONCILED');
    await h.enter();
    expect(h.log).toEqual(['goto:L08:']);
  });

  test('data: map, texts, dialogs, hints', () => {
    checkLevelData(L07, expect as never);
  });
});
