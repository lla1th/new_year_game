/** P-03 «Колокола» — pure logic (PUZZLE_SPECIFICATIONS.md P-03). */
export type BellSymbol = 'snowflake' | 'star' | 'tree' | 'bell';
export const BELL_ORDER: readonly BellSymbol[] = ['snowflake', 'star', 'tree', 'bell'];
export const BELL_LAYOUT: readonly BellSymbol[] = ['star', 'bell', 'snowflake', 'tree'];   // left to right on screen
export interface BellsState { progress: number; errors: number; solved: boolean }

export function createBells(): BellsState {
    return { progress: 0, errors: 0, solved: false };
}

/** wrong: progress = 0, errors + 1, showHint on every 3rd error; after solving → 'ignored'. */
export function ringBell(s: BellsState, b: BellSymbol): { state: BellsState; result: 'correct' | 'wrong' | 'solved' | 'ignored'; showHint: boolean } {
    if (s.solved) return { state: s, result: 'ignored', showHint: false };
    if (BELL_ORDER[s.progress] === b) {
        const progress = s.progress + 1;
        const solved = progress === BELL_ORDER.length;
        return { state: { ...s, progress, solved }, result: solved ? 'solved' : 'correct', showHint: false };
    }
    const errors = s.errors + 1;
    return { state: { ...s, progress: 0, errors }, result: 'wrong', showHint: errors % 3 === 0 };
}
