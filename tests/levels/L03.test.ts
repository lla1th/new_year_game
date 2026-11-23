import { describe, test, expect } from 'vitest';
import { L03 } from '../../src/game/levels/L03';
import { harness, checkLevelData } from './harness';

describe('L03 «Часовая башня»', () => {
  test('walkthrough: door, owl, stairs, bells', async () => {
    const h = harness(L03);
    const { state, log } = h;
    state.addItem('ITEM_MANDARIN'); state.addItem('ITEM_COCOA');
    await h.enter('square');
    expect(state.hasItem('ITEM_MANDARIN')).toBe(false); expect(state.hasItem('ITEM_COCOA')).toBe(true);
    await h.click('tower_door'); expect(state.hasFlag('L03_DOOR_OPEN')).toBe(true);
    expect(log).not.toContain('goto:L03:floor1');
    await h.click('tower_door'); expect(log).toContain('goto:L03:floor1');
    await h.click('stairs_up'); expect(log).not.toContain('goto:L03:top');   // the owl does not let her pass
    expect(log).toContain('say:ksyusha:l03.stairs.blocked');
    await h.click('owl'); expect(log).toContain('say:owl:l03.owl.talk');
    await h.use('owl', 'ITEM_COCOA'); expect(state.hasFlag('L03_OWL_AWAKE')).toBe(true); expect(state.hasItem('ITEM_COCOA')).toBe(false);
    expect(log).toContain('say:owl:l03.owl.awake');
    await h.click('stairs_up'); expect(log).toContain('goto:L03:top');
    await h.click('bells');      // P-03 → true
    expect(state.parts).toEqual(['PART_SPRING']); expect(state.hasFlag('L03_BELLS_DONE')).toBe(true);
    expect(log).toContain('cutscene:world1_2'); expect(log).toContain('goto:L04:');
    expect(log.indexOf('checkpoint', log.indexOf('puzzle:P-03'))).toBeLessThan(log.indexOf('goto:L04:'));
  });

  test('fresco opens the close-up (sets L03_FRESCO_SEEN there); the puzzle works without it', async () => {
    const h = harness(L03);
    h.setScreen('floor1');
    await h.click('fresco'); expect(h.log).toContain('puzzle:fresco');
    await h.inspect('fresco'); expect(h.log.filter(l => l === 'puzzle:fresco')).toHaveLength(2);
    h.setScreen('top');
    await h.click('bells');
    expect(h.state.hasFlag('L03_BELLS_DONE')).toBe(true);
  });

  test('bells closed without solving: no Spring, no transition', async () => {
    const h = harness(L03, { puzzles: { 'P-03': false } });
    h.setScreen('top');
    await h.click('bells');
    expect(h.state.parts).toEqual([]);
    expect(h.log.some(l => l.startsWith('goto:L04'))).toBe(false);
  });

  test('stairs down from the top go back to the first floor', async () => {
    const h = harness(L03);
    h.setScreen('top');
    await h.click('stairs_down');
    expect(h.log).toContain('goto:L03:floor1');
  });

  test('Continue after the bells (checkpoint on top) moves on to L04', async () => {
    const h = harness(L03);
    h.state.setFlag('L03_BELLS_DONE');
    await h.enter('top');
    expect(h.log).toContain('goto:L04:');
  });

  test('data: maps, texts, dialogs, hints', () => {
    checkLevelData(L03, expect as never);
  });
});
