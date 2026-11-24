import type { Facing } from '../data/types';

export function facingFromVector(dx: number, dy: number): Facing {
    if (dx >= 0) return dy >= 0 ? 'dr' : 'ur';
    return dy >= 0 ? 'dl' : 'ul';
}

/** Screen direction of a move: down, up, left, right (for 4-direction walk animations). */
export type MoveDir = 'd' | 'u' | 'l' | 'r';

/** Vertical when the move is steeper than 45°, horizontal otherwise. */
export function moveDirFromVector(dx: number, dy: number): MoveDir {
    if (Math.abs(dy) > Math.abs(dx)) return dy > 0 ? 'd' : 'u';
    return dx < 0 ? 'l' : 'r';
}
