import type { Facing } from '../data/types';

export function facingFromVector(dx: number, dy: number): Facing {
    if (dx >= 0) return dy >= 0 ? 'dr' : 'ur';
    return dy >= 0 ? 'dl' : 'ul';
}
