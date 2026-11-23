import type { ItemId } from '../../game/data/types';

/** P-02 «Генератор» — pure logic (SCRIPT §5.4). */
export type BulbColor = 'red' | 'yellow' | 'blue';
export const BULB_COLORS: readonly BulbColor[] = ['red', 'yellow', 'blue'];
export const BULB_ITEM: Record<BulbColor, ItemId> = { red: 'ITEM_BULB_RED', yellow: 'ITEM_BULB_YELLOW', blue: 'ITEM_BULB_BLUE' };

export interface GeneratorState { sockets: Record<BulbColor, boolean>; fueled: boolean; on: boolean }

/** `init` restores the state from the saved flags (L02_BULBS_PLACED, L02_FUELED). */
export function createGenerator(init: { bulbs?: boolean; fueled?: boolean } = {}): GeneratorState {
    const b = init.bulbs === true;
    return { sockets: { red: b, yellow: b, blue: b }, fueled: init.fueled === true, on: false };
}

export function bulbsComplete(s: GeneratorState): boolean {
    return BULB_COLORS.every(c => s.sockets[c]);
}

/** A bulb fits only into the socket of its own colour. */
export function insertBulb(s: GeneratorState, socket: BulbColor, bulb: BulbColor):
    { state: GeneratorState; result: 'ok' | 'wrong' | 'occupied' | 'locked' } {
    if (s.on) return { state: s, result: 'locked' };
    if (socket !== bulb) return { state: s, result: 'wrong' };
    if (s.sockets[socket]) return { state: s, result: 'occupied' };
    return { state: { ...s, sockets: { ...s.sockets, [socket]: true } }, result: 'ok' };
}

/** Closing the screen before all three bulbs are in: they go back to the inventory (nothing is lost by a save). */
export function ejectBulbs(s: GeneratorState): { state: GeneratorState; returned: BulbColor[] } {
    if (s.on || bulbsComplete(s)) return { state: s, returned: [] };
    const returned = BULB_COLORS.filter(c => s.sockets[c]);
    return { state: { ...s, sockets: { red: false, yellow: false, blue: false } }, returned };
}

export function pourFuel(s: GeneratorState): { state: GeneratorState; result: 'ok' | 'already' | 'locked' } {
    if (s.on) return { state: s, result: 'locked' };
    if (s.fueled) return { state: s, result: 'already' };
    return { state: { ...s, fueled: true }, result: 'ok' };
}

/** The cord works only with all three bulbs and fuel; otherwise «Чихнул и затих». */
export function pullCord(s: GeneratorState): { state: GeneratorState; result: 'on' | 'sputter' | 'locked' } {
    if (s.on) return { state: s, result: 'locked' };
    if (!bulbsComplete(s) || !s.fueled) return { state: s, result: 'sputter' };
    return { state: { ...s, on: true }, result: 'on' };
}
