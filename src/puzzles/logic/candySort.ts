export const SORT_SIZE = 7;
export const SORT_MOVES = 18;
export const SORT_TARGET = 8;
export const CANDIES = ['●', '◆', '▲', '★', '✿'];
export const CANDY_COLORS = ['#ff91a7', '#8ae2f1', '#ffda76', '#c9abff', '#9be3a3'];
const KINDS = CANDIES.length;

const START = [
    0, 1, 0, 3, 2, 0, 2,
    2, 0, 1, 2, 4, 1, 3,
    4, 1, 2, 0, 1, 3, 2,
    2, 3, 4, 1, 2, 4, 0,
    1, 4, 3, 2, 4, 0, 1,
    3, 0, 1, 4, 0, 2, 3,
    4, 2, 0, 1, 3, 1, 4,
];

export function adjacent(a: number, b: number): boolean {
    return Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 &&
        a < SORT_SIZE ** 2 && b < SORT_SIZE ** 2 &&
        (Math.abs(a % SORT_SIZE - b % SORT_SIZE) + Math.abs(Math.floor(a / SORT_SIZE) - Math.floor(b / SORT_SIZE)) === 1);
}

export function candyMatches(board: readonly number[]): number[] {
    const matched = new Set<number>();
    const scan = (start: number, step: number) => {
        for (let first = 0; first < SORT_SIZE;) {
            let end = first + 1;
            while (end < SORT_SIZE && board[start + end * step] === board[start + first * step]) end++;
            if (end - first >= 3) for (let i = first; i < end; i++) matched.add(start + i * step);
            first = end;
        }
    };
    for (let i = 0; i < SORT_SIZE; i++) {
        scan(i * SORT_SIZE, 1);
        scan(i, SORT_SIZE);
    }
    return [...matched];
}

function swapped(board: readonly number[], a: number, b: number): number[] {
    const result = [...board];
    [result[a], result[b]] = [result[b], result[a]];
    return result;
}

export function candyMoves(board: readonly number[]): [number, number][] {
    const moves: [number, number][] = [];
    for (let a = 0; a < board.length; a++) {
        for (const b of [a + 1, a + SORT_SIZE]) {
            if (adjacent(a, b) && board[a] !== board[b] && candyMatches(swapped(board, a, b)).length) moves.push([a, b]);
        }
    }
    return moves;
}

export interface CandyCascade {
    cleared: number[];
    board: number[];
    falls: number[];
}

export class CandySort {
    board = [...START];
    counts = [0, 0, 0];
    moves = SORT_MOVES;
    private seed = 404;

    get won() { return this.counts.every(count => count >= SORT_TARGET); }
    get lost() { return !this.won && this.moves === 0; }

    private nextCandy(): number {
        this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
        return (this.seed >>> 16) % KINDS;
    }

    play(a: number, b: number): { swap: number[]; cascades: CandyCascade[]; shuffled: boolean } | null {
        if (this.won || this.lost || !adjacent(a, b)) return null;
        const swap = swapped(this.board, a, b);
        let cleared = candyMatches(swap);
        if (!cleared.length) return null;

        this.moves--;
        this.board = [...swap];
        const cascades: CandyCascade[] = [];
        while (cleared.length) {
            for (const index of cleared) {
                const kind = this.board[index];
                if (kind < this.counts.length) this.counts[kind]++;
            }
            const removed = new Set(cleared);
            const falls = Array<number>(this.board.length).fill(0);
            for (let col = 0; col < SORT_SIZE; col++) {
                let dest = SORT_SIZE - 1;
                for (let row = SORT_SIZE - 1; row >= 0; row--) {
                    const from = row * SORT_SIZE + col;
                    if (removed.has(from)) continue;
                    this.board[dest * SORT_SIZE + col] = this.board[from];
                    falls[dest * SORT_SIZE + col] = dest - row;
                    dest--;
                }
                const incoming = dest + 1;
                for (; dest >= 0; dest--) {
                    this.board[dest * SORT_SIZE + col] = this.nextCandy();
                    falls[dest * SORT_SIZE + col] = incoming;
                }
            }
            cascades.push({ cleared, falls, board: [...this.board] });
            cleared = candyMatches(this.board);
        }

        const shuffled = !this.won && !this.lost && !candyMoves(this.board).length;
        if (shuffled) this.shuffle();
        return { swap, cascades, shuffled };
    }

    private shuffle(): void {
        // Try a true shuffle first. A pathological candy distribution gets the known playable layout.
        const board = [...this.board];
        for (let attempt = 0; attempt < 32; attempt++) {
            for (let i = board.length - 1; i > 0; i--) {
                this.nextCandy();
                const j = (this.seed >>> 8) % (i + 1);
                [board[i], board[j]] = [board[j], board[i]];
            }
            if (!candyMatches(board).length && candyMoves(board).length) {
                this.board = board;
                return;
            }
        }
        this.board = [...START];
    }
}
