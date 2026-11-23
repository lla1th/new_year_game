import { describe, test, expect } from 'vitest';
import { BELL_LAYOUT, BELL_ORDER, createBells, ringBell } from '../../src/puzzles/logic/bells';

describe('P-03 bells', () => {
  test('constants from the spec', () => {
    expect(BELL_ORDER).toEqual(['snowflake', 'star', 'tree', 'bell']);
    expect(BELL_LAYOUT).toEqual(['star', 'bell', 'snowflake', 'tree']);
    expect(createBells()).toEqual({ progress: 0, errors: 0, solved: false });
  });

  test('1. right order → solved', () => {
    let s = createBells();
    for (const b of ['snowflake', 'star', 'tree'] as const) {
      const r = ringBell(s, b);
      expect(r.result).toBe('correct');
      s = r.state;
    }
    const last = ringBell(s, 'bell');
    expect(last.result).toBe('solved');
    expect(last.state.solved).toBe(true);
    expect(ringBell(last.state, 'snowflake').result).toBe('ignored');
    expect(ringBell(last.state, 'snowflake').state).toEqual(last.state);
  });

  test('2. mistake on the 4th press → back to the start', () => {
    const t = ringBell(ringBell(ringBell(createBells(), 'snowflake').state, 'star').state, 'tree').state;
    const w = ringBell(t, 'star');
    expect(w.result).toBe('wrong');
    expect(w.state.progress).toBe(0);
    expect(w.state.errors).toBe(1);
  });

  test('3. every 3rd mistake shows the hint', () => {
    let e = createBells();
    const hints: boolean[] = [];
    for (let i = 0; i < 6; i++) { const r = ringBell(e, 'tree'); e = r.state; hints.push(r.showHint); }
    expect(hints).toEqual([false, false, true, false, false, true]);
    expect(e.errors).toBe(6);
  });
});
