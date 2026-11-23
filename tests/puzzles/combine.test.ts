import { test, expect } from 'vitest';
import { combineItems } from '../../src/puzzles/logic/combine';

test('only ribbon + ginger medal combine (either order)', () => {
  expect(combineItems('ITEM_RIBBON', 'ITEM_GINGER_MEDAL')).toBe('ITEM_KEEPER_MEDAL');
  expect(combineItems('ITEM_GINGER_MEDAL', 'ITEM_RIBBON')).toBe('ITEM_KEEPER_MEDAL');
  expect(combineItems('ITEM_RIBBON', 'ITEM_COCOA')).toBeNull();
  expect(combineItems('ITEM_RIBBON', 'ITEM_RIBBON')).toBeNull();
  expect(combineItems('ITEM_MANDARIN', 'ITEM_SAUSAGE')).toBeNull();
});
