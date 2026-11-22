import { describe, test, expect } from 'vitest';
import { NavGrid } from '../../src/game/nav/NavGrid';
import { distance, type Polygon, type Vec2 } from '../../src/game/nav/geometry';

// Fixture geometry: walkable 100..1800 x 500..1000, blocker 800..1000 x 600..800
const walkable: Polygon[] = [[{ x: 100, y: 500 }, { x: 1800, y: 500 }, { x: 1800, y: 1000 }, { x: 100, y: 1000 }]];
const blocker: Polygon = [{ x: 800, y: 600 }, { x: 1000, y: 600 }, { x: 1000, y: 800 }, { x: 800, y: 800 }];
const blockers: Polygon[] = [blocker];

/** True if no path segment passes through the open interior of the (axis-aligned) blocker. */
function segmentsAvoid(path: Vec2[], rect: Polygon, from: Vec2 = { x: 300, y: 700 }): boolean {
  const minX = Math.min(...rect.map(p => p.x)), maxX = Math.max(...rect.map(p => p.x));
  const minY = Math.min(...rect.map(p => p.y)), maxY = Math.max(...rect.map(p => p.y));
  const pts = [from, ...path];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    // Liang-Barsky clip against the rectangle
    let t0 = 0, t1 = 1;
    const dx = b.x - a.x, dy = b.y - a.y;
    const checks: [number, number][] = [[-dx, a.x - minX], [dx, maxX - a.x], [-dy, a.y - minY], [dy, maxY - a.y]];
    let outside = false;
    for (const [p, q] of checks) {
      if (p === 0) { if (q <= 0) { outside = true; break; } continue; }
      const r = q / p;
      if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
    }
    if (outside || t0 >= t1) continue;
    const mid = { x: a.x + dx * (t0 + t1) / 2, y: a.y + dy * (t0 + t1) / 2 };
    if (mid.x > minX && mid.x < maxX && mid.y > minY && mid.y < maxY) return false;
  }
  return true;
}

describe('NavGrid', () => {
  const g = new NavGrid(walkable, blockers);

  test('isWalkable', () => {
    expect(g.isWalkable({ x: 300, y: 800 })).toBe(true);
    expect(g.isWalkable({ x: 900, y: 700 })).toBe(false); // inside blocker
    expect(g.isWalkable({ x: 50, y: 800 })).toBe(false);  // outside walkable
  });

  test('path around the blocker ends exactly at a walkable target', () => {
    const path = g.findPath({ x: 300, y: 700 }, { x: 1500, y: 700 });
    expect(path.at(-1)).toEqual({ x: 1500, y: 700 });
    expect(path.every(p => g.isWalkable(p))).toBe(true);
    expect(segmentsAvoid(path, blocker)).toBe(true);
  });

  test('target outside the area → nearest walkable point', () => {
    const toWall = g.findPath({ x: 300, y: 700 }, { x: 900, y: 300 });
    expect(toWall.length).toBeGreaterThan(0);
    expect(g.isWalkable(toWall.at(-1)!)).toBe(true);
    expect(distance(toWall.at(-1)!, { x: 900, y: 300 })).toBeLessThan(260);
  });

  test('target inside a blocker (furniture) → nearest walkable point, not through it', () => {
    const p = g.findPath({ x: 300, y: 700 }, { x: 900, y: 700 });
    expect(p.length).toBeGreaterThan(0);
    const end = p.at(-1)!;
    expect(g.isWalkable(end)).toBe(true);
    expect(distance(end, { x: 900, y: 700 })).toBeLessThan(120);
    expect(segmentsAvoid(p, blocker)).toBe(true);
  });

  test('same point → empty path', () => {
    expect(g.findPath({ x: 300, y: 700 }, { x: 300, y: 700 })).toEqual([]);
  });

  test('nearestWalkable returns a walkable cell center', () => {
    const n = g.nearestWalkable({ x: 900, y: 300 })!;
    expect(g.isWalkable(n)).toBe(true);
    expect(n.y).toBeGreaterThanOrEqual(500);
    expect(n.y).toBeLessThan(520);
  });

  test('no walkable area → nearestWalkable null, findPath []', () => {
    const empty = new NavGrid([], []);
    expect(empty.nearestWalkable({ x: 10, y: 10 })).toBeNull();
    expect(empty.findPath({ x: 10, y: 10 }, { x: 100, y: 100 })).toEqual([]);
  });

  test('unreachable separate walkable island → []', () => {
    const islands = new NavGrid(
      [walkable[0], [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 60 }, { x: 0, y: 60 }]],
      [],
    );
    expect(islands.findPath({ x: 300, y: 700 }, { x: 30, y: 30 })).toEqual([]);
  });

  test('path many-turn: every segment stays on walkable cells', () => {
    // U-shaped area: must go down, across, and up
    const u = new NavGrid(
      [[{ x: 0, y: 0 }, { x: 900, y: 0 }, { x: 900, y: 900 }, { x: 0, y: 900 }]],
      [[{ x: 300, y: 0 }, { x: 600, y: 0 }, { x: 600, y: 700 }, { x: 300, y: 700 }]],
    );
    const path = u.findPath({ x: 100, y: 100 }, { x: 800, y: 100 });
    expect(path.at(-1)).toEqual({ x: 800, y: 100 });
    expect(segmentsAvoid(path, [{ x: 300, y: 0 }, { x: 600, y: 0 }, { x: 600, y: 700 }, { x: 300, y: 700 }], { x: 100, y: 100 })).toBe(true);
  });
});
