/** P-08 «Пятнашки» 3×3 — pure logic (PUZZLE_SPECIFICATIONS.md P-08). 0 is the empty cell. */
export type Board = number[];
export const SOLVED: Board = [1, 2, 3, 4, 5, 6, 7, 8, 0];
export const HELP_DELAY_MS = 300_000;
const N = 3;

export function isSolved(b: Board): boolean {
    return b.every((v, i) => v === SOLVED[i]);
}

/** The tile at idx is next to the empty cell horizontally or vertically. */
export function canMove(b: Board, idx: number): boolean {
    const e = b.indexOf(0);
    if (idx < 0 || idx >= b.length || idx === e) return false;
    const sameRow = Math.floor(idx / N) === Math.floor(e / N);
    return (sameRow && Math.abs(idx - e) === 1) || Math.abs(idx - e) === N;
}

/** Slides the tile at idx into the empty cell; if it cannot move, the same array is returned. */
export function moveTile(b: Board, idx: number): Board {
    if (!canMove(b, idx)) return b;
    const e = b.indexOf(0);
    const next = [...b];
    [next[idx], next[e]] = [next[e], next[idx]];
    return next;
}

/** 3×3 (odd width): solvable iff the number of inversions is even. */
export function isSolvable(b: Board): boolean {
    const tiles = b.filter(v => v !== 0);
    let inv = 0;
    for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) if (tiles[i] > tiles[j]) inv++;
    return inv % 2 === 0;
}

function neighbours(b: Board): number[] {
    const out: number[] = [];
    for (let i = 0; i < b.length; i++) if (canMove(b, i)) out.push(i);
    return out;
}

/** `moves` random legal moves from the solved board, never undoing the previous one; reshuffles if it ends solved. */
export function shuffleBoard(rng: () => number = Math.random, moves = 80): Board {
    for (;;) {
        let b = SOLVED;
        let prevEmpty = -1;
        for (let m = 0; m < moves; m++) {
            const options = neighbours(b).filter(i => i !== prevEmpty);   // moving the tile back = undo
            const pick = options[Math.min(options.length - 1, Math.floor(rng() * options.length))];
            prevEmpty = b.indexOf(0);
            b = moveTile(b, pick);
        }
        if (!isSolved(b)) return b;
    }
}

function manhattan(b: Board): number {
    let d = 0;
    for (let i = 0; i < b.length; i++) {
        const v = b[i];
        if (v === 0) continue;
        const goal = v - 1;
        d += Math.abs(Math.floor(i / N) - Math.floor(goal / N)) + Math.abs((i % N) - (goal % N));
    }
    return d;
}

/** A* with the Manhattan heuristic; returns the tile indices to click one after another. */
export function solveBoard(start: Board): number[] {
    if (isSolved(start)) return [];
    const key = (b: Board) => b.join(',');
    const open: { b: Board; g: number; f: number }[] = [{ b: start, g: 0, f: manhattan(start) }];
    const came = new Map<string, { prev: string; move: number }>();
    const best = new Map<string, number>([[key(start), 0]]);
    const boards = new Map<string, Board>([[key(start), start]]);
    while (open.length) {
        let bi = 0;
        for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
        const cur = open.splice(bi, 1)[0];
        const ck = key(cur.b);
        if (isSolved(cur.b)) {
            const path: number[] = [];
            for (let k = ck; came.has(k);) { const c = came.get(k)!; path.push(c.move); k = c.prev; }
            return path.reverse();
        }
        if (cur.g > (best.get(ck) ?? Infinity)) continue;
        for (const idx of neighbours(cur.b)) {
            const nb = moveTile(cur.b, idx);
            const nk = key(nb);
            const g = cur.g + 1;
            if (g >= (best.get(nk) ?? Infinity)) continue;
            best.set(nk, g);
            boards.set(nk, nb);
            came.set(nk, { prev: ck, move: idx });
            open.push({ b: nb, g, f: g + manhattan(nb) });
        }
    }
    return [];   // unsolvable board
}

/** Offer of help after `delayMs` since opening / the last "Сама!". After an offer it waits for the answer. */
export class HelpTimer {
    private start: number;
    private waiting = false;

    constructor(private readonly now: () => number, private readonly delayMs: number = HELP_DELAY_MS) {
        this.start = now();
    }

    shouldOffer(): boolean {
        if (this.waiting || this.now() - this.start < this.delayMs) return false;
        this.waiting = true;
        return true;
    }

    /** «Сама!» → the next offer comes `delayMs` later. */
    decline(): void {
        this.waiting = false;
        this.start = this.now();
    }

    /** Force an offer now (hint step 3). */
    offerNow(): void {
        this.start = this.now() - this.delayMs;
        this.waiting = false;
    }
}
