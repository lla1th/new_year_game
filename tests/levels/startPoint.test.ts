import { test, expect } from 'vitest';
import { startScreen } from '../../src/game/levels/index';

test('a saved screen that the level does not have falls back to the first screen', () => {
  expect(startScreen('L01', null)).toBeUndefined();
  expect(startScreen('L01', 'apartment')).toBe('apartment');
  expect(startScreen('L01', 'no_such_screen')).toBeUndefined();
});
