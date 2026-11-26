import { openSides, type PipeType, type Side } from './pipes';

export const PIPE_SIZE = 5;
export const PIPE_OUTLET = 24;
export const PIPE_LAYOUT: readonly (PipeType | null)[] = [
    'I', 'L', null, 'I', 'L',
    'L', 'L', 'I', 'L', null,
    'I', null, 'L', 'L', 'L',
    'L', 'I', 'L', null, 'I',
    null, 'I', 'L', 'I', 'L',
];

export const PIPE_START = [
    0, 2, 0, 1, 3,
    3, 2, 1, 0, 0,
    0, 0, 0, 1, 1,
    2, 0, 2, 0, 0,
    0, 1, 3, 0, 2,
];

const NEXT: Record<Side, [number, number, Side]> = {
    U: [0, -1, 'D'], R: [1, 0, 'L'], D: [0, 1, 'U'], L: [-1, 0, 'R'],
};

export function traceGlaze(rotations: readonly number[]) {
    const path: number[] = [];
    let tile = 0;
    let entry: Side = 'L';
    while (!path.includes(tile)) {
        const type = PIPE_LAYOUT[tile];
        const sides = type ? openSides(type, rotations[tile]) : [];
        if (!sides.includes(entry)) return { path, won: false, leak: path.at(-1) ?? tile };
        path.push(tile);
        const exit = sides.find(side => side !== entry)!;
        if (tile === PIPE_OUTLET && exit === 'R') return { path, won: true, leak: null };

        const [dx, dy, opposite] = NEXT[exit];
        const x = tile % PIPE_SIZE + dx;
        const y = Math.floor(tile / PIPE_SIZE) + dy;
        if (x < 0 || x >= PIPE_SIZE || y < 0 || y >= PIPE_SIZE) return { path, won: false, leak: tile };
        tile = y * PIPE_SIZE + x;
        entry = opposite;
    }
    return { path, won: false, leak: path.at(-1) ?? 0 };
}
