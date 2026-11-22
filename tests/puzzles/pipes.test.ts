import { describe, test, expect } from 'vitest';
import { PIPES_TYPES, PIPES_START_ROT, openSides, createPipes, rotateTile, computeFlow, wrongReferenceTiles, type PipesState } from '../../src/puzzles/logic/pipes';

/** Rotates tiles (via rotateTile) until each "col,row" has the wanted rotation. */
function applyRotations(s: PipesState, want: Record<string, number>): PipesState {
  for (const [k, r] of Object.entries(want)) {
    const [col, row] = k.split(',').map(Number);
    for (let i = 0; i < 4 && s.rot[row][col] !== r; i++) s = rotateTile(s, col, row);
  }
  return s;
}
const REF = { '0,0': 0, '1,0': 2, '1,1': 1, '1,2': 0, '2,2': 2, '2,3': 0, '3,3': 0 };

describe('P-04 pipes', () => {
  test('layout from the spec table', () => {
    expect(PIPES_TYPES).toEqual([['I', 'L', 'L', 'I'], ['L', 'I', 'L', 'L'], ['I', 'L', 'L', 'I'], ['L', 'L', 'L', 'I']]);
    expect(PIPES_START_ROT).toEqual([[1, 0, 0, 0], [0, 0, 0, 0], [0, 2, 3, 0], [0, 0, 1, 1]]);
  });

  test('open sides', () => {
    expect(openSides('I', 0).sort()).toEqual(['L', 'R']); expect(openSides('I', 1).sort()).toEqual(['D', 'U']);
    expect(openSides('I', 2).sort()).toEqual(['L', 'R']); expect(openSides('I', 3).sort()).toEqual(['D', 'U']);
    expect(openSides('L', 0).sort()).toEqual(['R', 'U']); expect(openSides('L', 1).sort()).toEqual(['D', 'R']);
    expect(openSides('L', 2).sort()).toEqual(['D', 'L']); expect(openSides('L', 3).sort()).toEqual(['L', 'U']);
  });

  test('5. the start layout is not solved', () => {
    expect(computeFlow(createPipes()).reachesOutlet).toBe(false);
  });

  test('1. reference rotations → outlet reached; flow follows the path', () => {
    const ref = applyRotations(createPipes(), REF);
    const f = computeFlow(ref);
    expect(f.reachesOutlet).toBe(true);
    for (const k of Object.keys(REF)) { const [c, r] = k.split(',').map(Number); expect(f.filled[r][c], k).toBe(true); }
    expect(wrongReferenceTiles(ref)).toEqual([]);
  });

  test('rotation +1 mod 4; immutable', () => {
    const s = createPipes();
    const t = rotateTile(s, 0, 0);
    expect(t.rot[0][0]).toBe(2);
    expect(s.rot[0][0]).toBe(1);
    expect(rotateTile(rotateTile(rotateTile(t, 3, 3), 3, 3), 3, 3).rot[3][3]).toBe(0);
  });

  test('4. after solving clicks change nothing', () => {
    const ref = applyRotations(createPipes(), REF);
    const solvedState = { ...ref, solved: true };
    expect(rotateTile(solvedState, 0, 0)).toEqual(solvedState);
  });

  test('3. reset = createPipes() gives the start layout', () => {
    expect(createPipes().rot).toEqual(PIPES_START_ROT);
    expect(createPipes().rot).not.toBe(PIPES_START_ROT);
  });

  test('connection needs both sides open towards each other', () => {
    // (0,0) points right, but (1,0) in its start rotation (L/0 = up-right) has no left side → only (0,0) is filled
    const s = rotateTile(createPipes(), 0, 0);
    const f = computeFlow(s);
    expect(f.filled[0][0]).toBe(true);
    expect(f.filled[0][1]).toBe(false);
  });

  test('2. any connected path counts (not only the reference one)', () => {
    // The spec layout has only the reference route, so check the flow on a custom layout:
    // along the top row to the right edge, then down the right column to the outlet.
    const alt: PipesState = {
      types: [['I', 'I', 'I', 'L'], ['L', 'L', 'L', 'I'], ['L', 'L', 'L', 'I'], ['L', 'L', 'L', 'L']],
      rot: [[0, 0, 0, 2], [0, 0, 0, 1], [0, 0, 0, 1], [0, 0, 0, 0]],
      solved: false,
    };
    expect(computeFlow(alt).reachesOutlet).toBe(true);
    expect(wrongReferenceTiles(createPipes()).length).toBeGreaterThan(0);
  });
});
