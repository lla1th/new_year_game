import { test, expect } from 'vitest';
import { facingFromVector, moveDirFromVector } from '../../src/game/nav/facing';

test('facingFromVector', () => {
  expect(facingFromVector(1, 1)).toBe('dr');
  expect(facingFromVector(1, -1)).toBe('ur');
  expect(facingFromVector(-1, 1)).toBe('dl');
  expect(facingFromVector(-1, -1)).toBe('ul');
  expect(facingFromVector(1, 0)).toBe('dr');
  expect(facingFromVector(0, -1)).toBe('ur');
});

test('moveDirFromVector: steeper than 45° is vertical', () => {
  expect(moveDirFromVector(0, 5)).toBe('d');
  expect(moveDirFromVector(1, -3)).toBe('u');
  expect(moveDirFromVector(-4, 1)).toBe('l');
  expect(moveDirFromVector(2, 1)).toBe('r');   // isometric diagonal → side view
  expect(moveDirFromVector(1, 1)).toBe('r');
});
