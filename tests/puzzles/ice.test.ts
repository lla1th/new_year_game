import { describe, test, expect } from 'vitest';
import { ICE, createIce, slideTarget, availableDirs, pushBox, isIceSolved } from '../../src/puzzles/logic/ice';

describe('P-05 ice crates', () => {
  test('layout from the spec', () => {
    expect(ICE.size).toBe(5);
    expect(ICE.targets).toEqual([{ x: 1, y: 0 }, { x: 3, y: 0 }]);
    expect(ICE.obstacles).toEqual([{ x: 0, y: 3 }, { x: 4, y: 1 }, { x: 4, y: 2 }]);
    expect(createIce()).toEqual({ boxes: [{ x: 0, y: 4 }, { x: 4, y: 4 }], resets: 0, solved: false });
    expect(createIce(2).resets).toBe(2);
  });

  test('1. reference solution in 5 pushes', () => {
    let s = createIce();
    expect(availableDirs(s, 0)).not.toContain('left');                 // 2. A at the wall: no left arrow
    expect(slideTarget(s, 1, 'up')).toEqual({ x: 4, y: 3 });            // 3. B stops below (4,2)
    s = pushBox(s, 0, 'right'); expect(s.boxes[0]).toEqual({ x: 3, y: 4 });   // stops at B
    s = pushBox(s, 0, 'up'); expect(s.boxes[0]).toEqual({ x: 3, y: 0 });
    s = pushBox(s, 1, 'up'); s = pushBox(s, 1, 'left'); expect(s.boxes[1]).toEqual({ x: 1, y: 3 });
    expect(s.solved).toBe(false);
    s = pushBox(s, 1, 'up'); expect(s.solved).toBe(true);
    expect(pushBox(s, 1, 'down')).toEqual(s);                           // after solving nothing changes
  });

  test('a push that cannot move even one cell: no arrow, state unchanged', () => {
    const s = createIce();
    expect(slideTarget(s, 0, 'left')).toBeNull();
    expect(slideTarget(s, 0, 'down')).toBeNull();
    expect(slideTarget(s, 0, 'up')).toBeNull();                         // (0,3) is an obstacle
    expect(availableDirs(s, 0)).toEqual(['right']);
    expect(pushBox(s, 0, 'left')).toBe(s);
  });

  test('5. crates are interchangeable', () => {
    expect(isIceSolved([{ x: 3, y: 0 }, { x: 1, y: 0 }])).toBe(true);
    expect(isIceSolved([{ x: 1, y: 0 }, { x: 3, y: 0 }])).toBe(true);
    expect(isIceSolved([{ x: 1, y: 0 }, { x: 2, y: 0 }])).toBe(false);
  });

  test('4. reset = createIce(resets + 1): start positions, counter grows', () => {
    const s = pushBox(createIce(), 0, 'right');
    const r = createIce(s.resets + 1);
    expect(r.boxes).toEqual([{ x: 0, y: 4 }, { x: 4, y: 4 }]);
    expect(r.resets).toBe(1);
  });

  test('immutability', () => {
    const s = createIce();
    pushBox(s, 0, 'right');
    expect(s.boxes[0]).toEqual({ x: 0, y: 4 });
  });
});
