/** P-06 «Страница комикса» — pure logic (PUZZLE_SPECIFICATIONS.md P-06). order[position] = panel number 1..4. */
export interface ComicState { order: number[]; solved: boolean }

export function createComic(): ComicState {
    return { order: [3, 1, 4, 2], solved: false };
}

/** Swaps two panels; after solving (or for a bad / same index) the same state is returned. */
export function swapPanels(s: ComicState, i: number, j: number): ComicState {
    const n = s.order.length;
    if (s.solved || i === j || i < 0 || j < 0 || i >= n || j >= n) return s;
    const order = [...s.order];
    [order[i], order[j]] = [order[j], order[i]];
    return { order, solved: order.every((p, pos) => p === pos + 1) };
}

export function panelCorrect(s: ComicState, pos: number): boolean {
    return s.order[pos] === pos + 1;
}
