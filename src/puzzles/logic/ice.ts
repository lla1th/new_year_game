import type { Vec2 } from '../../game/nav/geometry';

/** P-05 «Ледяные ящики» — pure logic (PUZZLE_SPECIFICATIONS.md P-05). Coordinates (col = x, row = y), row 0 at the shelf. */
export type Dir = 'up' | 'down' | 'left' | 'right';
export interface IceState { boxes: Vec2[]; resets: number; solved: boolean }
export const ICE = {
    size: 5,
    targets: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
    obstacles: [{ x: 0, y: 3 }, { x: 4, y: 1 }, { x: 4, y: 2 }],
    start: [{ x: 0, y: 4 }, { x: 4, y: 4 }],
} as const;

const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];
const STEP: Record<Dir, Vec2> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

export function createIce(resets = 0): IceState {
    return { boxes: ICE.start.map(p => ({ x: p.x, y: p.y })), resets, solved: false };
}

function blocked(s: IceState, box: number, p: Vec2): boolean {
    if (p.x < 0 || p.y < 0 || p.x >= ICE.size || p.y >= ICE.size) return true;
    if (ICE.obstacles.some(o => o.x === p.x && o.y === p.y)) return true;
    return s.boxes.some((b, i) => i !== box && b.x === p.x && b.y === p.y);
}

/** Where the crate stops when pushed; null if it cannot move even one cell. */
export function slideTarget(s: IceState, box: number, d: Dir): Vec2 | null {
    const b = s.boxes[box];
    if (!b) return null;
    const step = STEP[d];
    let cur = { x: b.x, y: b.y };
    for (;;) {
        const next = { x: cur.x + step.x, y: cur.y + step.y };
        if (blocked(s, box, next)) break;
        cur = next;
    }
    return cur.x === b.x && cur.y === b.y ? null : cur;
}

export function availableDirs(s: IceState, box: number): Dir[] {
    return DIRS.filter(d => slideTarget(s, box, d) !== null);
}

/** Pushes a crate; after solving (or if it cannot move) the same state is returned. */
export function pushBox(s: IceState, box: number, d: Dir): IceState {
    if (s.solved) return s;
    const to = slideTarget(s, box, d);
    if (!to) return s;
    const boxes = s.boxes.map((b, i) => (i === box ? to : { ...b }));
    return { ...s, boxes, solved: isIceSolved(boxes) };
}

/** Both marks are taken; crates are interchangeable. */
export function isIceSolved(boxes: Vec2[]): boolean {
    return ICE.targets.every(t => boxes.some(b => b.x === t.x && b.y === t.y));
}
