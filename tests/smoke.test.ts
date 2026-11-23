import { test, expect } from 'vitest';
import { FLAG_IDS, LEVEL_STYLE, INVENTORY_SIZE } from '../src/game/data/types';

test('contracts', () => {
  expect(FLAG_IDS).toContain('L01_SPITZ_FREED');
  expect(LEVEL_STYLE.L04).toBe('w2');
  expect(INVENTORY_SIZE).toBe(6);
});
