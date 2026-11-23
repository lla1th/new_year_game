import { test, expect } from 'vitest';
import { classifyPress, releaseAction, LONG_PRESS_MS, DRAG_THRESHOLD_PX } from '../../src/ui/input/press';

test('classifyPress: tap / long / drag', () => {
  expect(LONG_PRESS_MS).toBe(500);
  expect(DRAG_THRESHOLD_PX).toBe(12);
  expect(classifyPress(100, 0)).toBe('tap');
  expect(classifyPress(499, 12)).toBe('tap');
  expect(classifyPress(500, 0)).toBe('long');
  expect(classifyPress(100, 13)).toBe('drag');
  expect(classifyPress(900, 40)).toBe('drag');   // a finger that moved is a drag / scroll, never "use"
});

test('releaseAction: what a lifted finger does in the scene', () => {
  expect(releaseAction(100, 0, false)).toBe('use');
  expect(releaseAction(100, 0, true)).toBe('none');      // touchcancel (iOS back-swipe, call) never uses a hotspot
  expect(releaseAction(900, 0, true)).toBe('none');
  expect(releaseAction(100, 13, false)).toBe('none');    // scroll gesture
  expect(releaseAction(505, 0, false)).toBe('inspect');  // released before the long-press timer ticked
});
