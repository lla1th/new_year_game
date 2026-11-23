import { describe, test, expect } from 'vitest';
import { pointInPolygon, distance } from '../../src/game/nav/geometry';

const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];

describe('geometry', () => {
  test('pointInPolygon: inside', () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
  });
  test('pointInPolygon: outside', () => {
    expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
  });
  test('pointInPolygon: on edge counts as inside', () => {
    expect(pointInPolygon({ x: 10, y: 5 }, square)).toBe(true);
  });
  test('pointInPolygon: on vertex and top/left edges counts as inside', () => {
    expect(pointInPolygon({ x: 0, y: 0 }, square)).toBe(true);
    expect(pointInPolygon({ x: 5, y: 0 }, square)).toBe(true);
    expect(pointInPolygon({ x: 0, y: 5 }, square)).toBe(true);
  });
  test('distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
