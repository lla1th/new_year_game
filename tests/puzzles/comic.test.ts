import { test, expect } from 'vitest';
import { createComic, swapPanels, panelCorrect } from '../../src/puzzles/logic/comic';

test('P-06 comic page', () => {
  let s = createComic(); expect(s.order).toEqual([3, 1, 4, 2]); expect(s.solved).toBe(false);
  s = swapPanels(s, 0, 1); expect(s.order).toEqual([1, 3, 4, 2]); expect(panelCorrect(s, 0)).toBe(true); expect(panelCorrect(s, 1)).toBe(false);
  s = swapPanels(s, 1, 3); s = swapPanels(s, 2, 3); expect(s.order).toEqual([1, 2, 3, 4]); expect(s.solved).toBe(true);
  expect(swapPanels(s, 0, 1)).toEqual(s);
});

test('swap with itself or a bad index changes nothing; immutable', () => {
  const s = createComic();
  expect(swapPanels(s, 1, 1)).toBe(s);
  expect(swapPanels(s, 0, 9)).toBe(s);
  swapPanels(s, 0, 1);
  expect(s.order).toEqual([3, 1, 4, 2]);
});
