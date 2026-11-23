/** P-04 «Трубы глазури» — pure logic (PUZZLE_SPECIFICATIONS.md P-04). Coordinates (col, row); arrays are [row][col]. */
export type PipeType = 'I' | 'L';
export type Side = 'U' | 'R' | 'D' | 'L';
export interface PipesState { types: PipeType[][]; rot: number[][]; solved: boolean }

export const PIPES_TYPES: PipeType[][] = [
    ['I', 'L', 'L', 'I'],
    ['L', 'I', 'L', 'L'],
    ['I', 'L', 'L', 'I'],
    ['L', 'L', 'L', 'I'],
];
export const PIPES_START_ROT: number[][] = [
    [1, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 2, 3, 0],
    [0, 0, 1, 1],
];
/** Reference solution (for hint step 3): "col,row" → rotation. */
export const PIPES_REFERENCE: Readonly<Record<string, number>> = { '0,0': 0, '1,0': 2, '1,1': 1, '1,2': 0, '2,2': 2, '2,3': 0, '3,3': 0 };

const SIZE = 4;
const I_SIDES: Side[][] = [['L', 'R'], ['U', 'D']];
const L_SIDES: Side[][] = [['U', 'R'], ['R', 'D'], ['D', 'L'], ['L', 'U']];
const OPPOSITE: Record<Side, Side> = { U: 'D', D: 'U', L: 'R', R: 'L' };
const STEP: Record<Side, [number, number]> = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

export function openSides(t: PipeType, rot: number): Side[] {
    const r = ((rot % 4) + 4) % 4;
    return [...(t === 'I' ? I_SIDES[r % 2] : L_SIDES[r])];
}

export function createPipes(): PipesState {
    return { types: PIPES_TYPES.map(r => [...r]), rot: PIPES_START_ROT.map(r => [...r]), solved: false };
}

/** +1 (90° clockwise) mod 4; after solving nothing changes. */
export function rotateTile(s: PipesState, col: number, row: number): PipesState {
    if (s.solved || row < 0 || row >= SIZE || col < 0 || col >= SIZE) return s;
    const rot = s.rot.map(r => [...r]);
    rot[row][col] = (rot[row][col] + 1) % 4;
    return { ...s, rot };
}

/** BFS from the inlet (left side of (0,0)); tiles connect only when both sides face each other. */
export function computeFlow(s: PipesState): { filled: boolean[][]; reachesOutlet: boolean } {
    const filled = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
    const sides = (c: number, r: number) => openSides(s.types[r][c], s.rot[r][c]);
    if (!sides(0, 0).includes('L')) return { filled, reachesOutlet: false };
    const queue: [number, number][] = [[0, 0]];
    filled[0][0] = true;
    while (queue.length) {
        const [c, r] = queue.shift()!;
        for (const side of sides(c, r)) {
            const [dc, dr] = STEP[side];
            const nc = c + dc;
            const nr = r + dr;
            if (nc < 0 || nr < 0 || nc >= SIZE || nr >= SIZE || filled[nr][nc]) continue;
            if (!sides(nc, nr).includes(OPPOSITE[side])) continue;
            filled[nr][nc] = true;
            queue.push([nc, nr]);
        }
    }
    const reachesOutlet = filled[SIZE - 1][SIZE - 1] && sides(SIZE - 1, SIZE - 1).includes('R');
    return { filled, reachesOutlet };
}

/** Reference-path tiles whose open sides are not as in the reference solution: [col, row][]. */
export function wrongReferenceTiles(s: PipesState): [number, number][] {
    const out: [number, number][] = [];
    for (const [k, want] of Object.entries(PIPES_REFERENCE)) {
        const [c, r] = k.split(',').map(Number);
        const have = openSides(s.types[r][c], s.rot[r][c]).sort().join();
        if (have !== openSides(s.types[r][c], want).sort().join()) out.push([c, r]);
    }
    return out;
}
