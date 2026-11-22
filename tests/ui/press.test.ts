import { test, expect } from 'vitest';
import { classifyPress, LONG_PRESS_MS, DRAG_THRESHOLD_PX } from '../../src/ui/input/press';

test('classifyPress: tap / long / drag', () => {
  expect(LONG_PRESS_MS).toBe(500);
  expect(DRAG_THRESHOLD_PX).toBe(12);
  expect(classifyPress(100, 0)).toBe('tap');
  expect(classifyPress(499, 12)).toBe('tap');
  expect(classifyPress(500, 0)).toBe('long');
  expect(classifyPress(100, 13)).toBe('drag');
  expect(classifyPress(900, 40)).toBe('drag');   // a finger that moved is a drag / scroll, never "use"
});
