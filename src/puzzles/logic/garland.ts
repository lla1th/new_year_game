import type { ItemId } from '../../game/data/types';

/** P-02 «Гирлянда» — pure logic (PUZZLE_SPECIFICATIONS.md P-02). */
export type BulbColor = 'red' | 'green' | 'gold' | 'blue';
export const GARLAND_TARGET: readonly BulbColor[] = ['red', 'green', 'gold', 'red', 'blue'];
export const BULB_ITEM: Record<'green' | 'gold' | 'blue', ItemId> = { green: 'ITEM_BULB_GREEN', gold: 'ITEM_BULB_GOLD', blue: 'ITEM_BULB_BLUE' };
export interface GarlandState { sockets: (BulbColor | null)[]; fixed: boolean[]; solved: boolean }

export function createGarland(): GarlandState {
    return { sockets: ['red', null, null, 'red', null], fixed: [true, false, false, true, false], solved: false };
}

function valid(s: GarlandState, idx: number): boolean {
    return Number.isInteger(idx) && idx >= 0 && idx < s.sockets.length;
}

/** null: fixed socket, occupied socket, bad index or already solved. */
export function insertBulb(s: GarlandState, idx: number, c: BulbColor): GarlandState | null {
    if (s.solved || !valid(s, idx) || s.fixed[idx] || s.sockets[idx] !== null) return null;
    const sockets = [...s.sockets];
    sockets[idx] = c;
    return { ...s, sockets };
}

/** Takes an inserted (not fixed) bulb out; color null when nothing can be taken. */
export function removeBulb(s: GarlandState, idx: number): { state: GarlandState; color: BulbColor | null } {
    if (s.solved || !valid(s, idx) || s.fixed[idx] || s.sockets[idx] === null) return { state: s, color: null };
    const sockets = [...s.sockets];
    const color = sockets[idx];
    sockets[idx] = null;
    return { state: { ...s, sockets }, color };
}

export function checkGarland(s: GarlandState): { complete: boolean; solved: boolean; wrongIdx: number[] } {
    const complete = s.sockets.every(c => c !== null);
    const wrongIdx = complete ? s.sockets.flatMap((c, i) => (c !== GARLAND_TARGET[i] ? [i] : [])) : [];
    return { complete, solved: complete && wrongIdx.length === 0, wrongIdx };
}

/** Removes the wrong bulbs (they go back to the inventory); solved = true if all bulbs were right. */
export function ejectWrong(s: GarlandState): { state: GarlandState; returned: BulbColor[] } {
    const returned: BulbColor[] = [];
    const sockets = s.sockets.map((c, i) => {
        if (c !== null && !s.fixed[i] && c !== GARLAND_TARGET[i]) { returned.push(c); return null; }
        return c;
    });
    const solved = sockets.every((c, i) => c === GARLAND_TARGET[i]);
    return { state: { ...s, sockets, solved }, returned };
}
