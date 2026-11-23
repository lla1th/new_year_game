import { describe, test, expect } from 'vitest';
import { L06 } from '../../src/game/levels/L06';
import { harness, checkLevelData } from './harness';

describe('L06 «Комикс-крыши»', () => {
  test('friends, comic page, bridge', async () => {
    const h = harness(L06);
    const { state, log } = h;
    await h.enter(); expect(log).toContain('dialog:l06_friends');
    await h.click('bridge'); expect(log.some(l => l.startsWith('goto:L07'))).toBe(false);   // no bridge yet
    await h.click('comic_page'); expect(state.hasFlag('L06_BRIDGE_DONE')).toBe(true); expect(log).toContain('checkpoint');
    await h.click('bridge'); expect(log).toContain('goto:L07:');
  });

  test('comic page closed unsolved: no bridge', async () => {
    const h = harness(L06, { puzzles: { 'P-06': false } });
    await h.click('comic_page');
    expect(h.state.hasFlag('L06_BRIDGE_DONE')).toBe(false);
  });

  test('Continue after the checkpoint: the friends dialog is not replayed', async () => {
    const h = harness(L06);
    h.state.setFlag('L06_BRIDGE_DONE');
    await h.enter();
    expect(h.log).not.toContain('dialog:l06_friends');
  });

  test('data: map, texts, dialogs, hints', () => {
    checkLevelData(L06, expect as never);
  });
});
