import { distance, pointInPolygon, type Polygon, type Vec2 } from './geometry';

const SQRT2 = Math.SQRT2;
// 8 neighbours: dx, dy
const DIRS: readonly [number, number][] = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/** Minimal binary min-heap keyed by f-score. */
class MinHeap {
    private items: number[] = [];
    private keys: number[] = [];
    get size(): number { return this.items.length; }
    push(item: number, key: number): void {
        this.items.push(item);
        this.keys.push(key);
        let i = this.items.length - 1;
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.keys[parent] <= this.keys[i]) break;
            this.swap(i, parent);
            i = parent;
        }
    }
    pop(): number {
        const top = this.items[0];
        const lastItem = this.items.pop()!;
        const lastKey = this.keys.pop()!;
        if (this.items.length > 0) {
            this.items[0] = lastItem;
            this.keys[0] = lastKey;
            let i = 0;
            for (;;) {
                const l = 2 * i + 1;
                const r = l + 1;
                let m = i;
                if (l < this.items.length && this.keys[l] < this.keys[m]) m = l;
                if (r < this.items.length && this.keys[r] < this.keys[m]) m = r;
                if (m === i) break;
                this.swap(i, m);
                i = m;
            }
        }
        return top;
    }
    private swap(a: number, b: number): void {
        [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
        [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
    }
}

/**
 * Walkability grid over the level (walkable polygons minus blockers) with A* path finding.
 * A cell is walkable if its centre lies inside any walkable polygon and inside no blocker.
 */
export class NavGrid {
    readonly cols: number;
    readonly rows: number;
    private readonly cells: Uint8Array;

    constructor(
        walkable: Polygon[],
        blockers: Polygon[],
        readonly cellSize: number = 16,
        readonly width: number = 1920,
        readonly height: number = 1080,
    ) {
        this.cols = Math.ceil(width / cellSize);
        this.rows = Math.ceil(height / cellSize);
        this.cells = new Uint8Array(this.cols * this.rows);
        for (let cy = 0; cy < this.rows; cy++) {
            for (let cx = 0; cx < this.cols; cx++) {
                const c = this.center(cx, cy);
                const ok = walkable.some(poly => pointInPolygon(c, poly))
                    && !blockers.some(poly => pointInPolygon(c, poly));
                if (ok) this.cells[cy * this.cols + cx] = 1;
            }
        }
    }

    isWalkable(p: Vec2): boolean {
        const cx = Math.floor(p.x / this.cellSize);
        const cy = Math.floor(p.y / this.cellSize);
        return this.cellWalkable(cx, cy);
    }

    /** Centre of the nearest walkable cell (BFS from the cell of `p`), or null if there is none. */
    nearestWalkable(p: Vec2): Vec2 | null {
        const cell = this.nearestWalkableCell(p);
        return cell === null ? null : this.center(cell % this.cols, Math.floor(cell / this.cols));
    }

    /**
     * Path without the start point; the last point is the target (or nearestWalkable(target)).
     * Returns [] if from equals the target or no path exists.
     */
    findPath(from: Vec2, to: Vec2): Vec2[] {
        const goalPoint = this.isWalkable(to) ? { x: to.x, y: to.y } : this.nearestWalkable(to);
        if (goalPoint === null) return [];
        if (from.x === goalPoint.x && from.y === goalPoint.y) return [];

        const startCell = this.nearestWalkableCell(from);
        if (startCell === null) return [];
        const goalCell = this.cellIndexOf(goalPoint);

        const cells = this.aStar(startCell, goalCell);
        if (cells === null) return [];

        // Raw polyline: real start, intermediate cell centres, real goal.
        const pts: Vec2[] = [{ x: from.x, y: from.y }];
        if (!this.isWalkable(from)) pts.push(this.centerOf(startCell));
        for (let i = 1; i < cells.length - 1; i++) pts.push(this.centerOf(cells[i]));
        pts.push(goalPoint);

        return this.smooth(pts);
    }

    // --- internals -------------------------------------------------------

    private center(cx: number, cy: number): Vec2 {
        return { x: (cx + 0.5) * this.cellSize, y: (cy + 0.5) * this.cellSize };
    }

    private centerOf(cell: number): Vec2 {
        return this.center(cell % this.cols, Math.floor(cell / this.cols));
    }

    private cellIndexOf(p: Vec2): number {
        const cx = Math.min(this.cols - 1, Math.max(0, Math.floor(p.x / this.cellSize)));
        const cy = Math.min(this.rows - 1, Math.max(0, Math.floor(p.y / this.cellSize)));
        return cy * this.cols + cx;
    }

    private cellWalkable(cx: number, cy: number): boolean {
        if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return false;
        return this.cells[cy * this.cols + cx] === 1;
    }

    /** BFS over the grid from the (clamped) cell of p; among the first ring that has walkable cells, picks the closest one. */
    private nearestWalkableCell(p: Vec2): number | null {
        const start = this.cellIndexOf(p);
        if (this.cells[start] === 1) return start;
        const seen = new Uint8Array(this.cells.length);
        seen[start] = 1;
        let frontier = [start];
        while (frontier.length > 0) {
            const next: number[] = [];
            let best: number | null = null;
            let bestDist = Infinity;
            for (const cell of frontier) {
                const cx = cell % this.cols;
                const cy = Math.floor(cell / this.cols);
                for (const [dx, dy] of DIRS) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;
                    const n = ny * this.cols + nx;
                    if (seen[n]) continue;
                    seen[n] = 1;
                    if (this.cells[n] === 1) {
                        const d = distance(this.center(nx, ny), p);
                        if (d < bestDist) { bestDist = d; best = n; }
                    }
                    next.push(n);
                }
            }
            if (best !== null) return best;
            frontier = next;
        }
        return null;
    }

    /** A* over 8 directions; diagonal moves need both adjacent orthogonal cells walkable. Octile heuristic. */
    private aStar(start: number, goal: number): number[] | null {
        if (start === goal) return [start];
        const n = this.cells.length;
        const g = new Float64Array(n).fill(Infinity);
        const came = new Int32Array(n).fill(-1);
        const closed = new Uint8Array(n);
        const gx = goal % this.cols;
        const gy = Math.floor(goal / this.cols);
        const h = (cell: number): number => {
            const dx = Math.abs((cell % this.cols) - gx);
            const dy = Math.abs(Math.floor(cell / this.cols) - gy);
            return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
        };

        const open = new MinHeap();
        g[start] = 0;
        open.push(start, h(start));
        while (open.size > 0) {
            const cur = open.pop();
            if (closed[cur]) continue;
            if (cur === goal) {
                const path: number[] = [];
                for (let c = goal; c !== -1; c = came[c]) path.push(c);
                return path.reverse();
            }
            closed[cur] = 1;
            const cx = cur % this.cols;
            const cy = Math.floor(cur / this.cols);
            for (const [dx, dy] of DIRS) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (!this.cellWalkable(nx, ny)) continue;
                const diagonal = dx !== 0 && dy !== 0;
                if (diagonal && (!this.cellWalkable(cx + dx, cy) || !this.cellWalkable(cx, cy + dy))) continue;
                const nb = ny * this.cols + nx;
                if (closed[nb]) continue;
                const cost = g[cur] + (diagonal ? SQRT2 : 1);
                if (cost < g[nb]) {
                    g[nb] = cost;
                    came[nb] = cur;
                    open.push(nb, cost + h(nb));
                }
            }
        }
        return null;
    }

    /** Segment check: samples every cellSize/2 must fall on walkable cells. */
    private clear(a: Vec2, b: Vec2): boolean {
        const len = distance(a, b);
        const steps = Math.max(1, Math.ceil(len / (this.cellSize / 2)));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            if (!this.isWalkable({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return false;
        }
        return true;
    }

    /** From the current point take the farthest path point reachable by a clear segment. Result excludes pts[0]. */
    private smooth(pts: Vec2[]): Vec2[] {
        const out: Vec2[] = [];
        let i = 0;
        while (i < pts.length - 1) {
            let j = pts.length - 1;
            while (j > i + 1 && !this.clear(pts[i], pts[j])) j--;
            out.push(pts[j]);
            i = j;
        }
        return out;
    }
}
