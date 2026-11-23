import { test, expect } from 'vitest';
import { facingFromVector } from '../../src/game/nav/facing';

test('facingFromVector', () => {
  expect(facingFromVector(1, 1)).toBe('dr');
  expect(facingFromVector(1, -1)).toBe('ur');
  expect(facingFromVector(-1, 1)).toBe('dl');
  expect(facingFromVector(-1, -1)).toBe('ul');
  expect(facingFromVector(1, 0)).toBe('dr');
  expect(facingFromVector(0, -1)).toBe('ur');
});
