export interface Vec2 { x: number; y: number }
export type Polygon = Vec2[];

const EPS = 1e-9;

function onSegment(p: Vec2, a: Vec2, b: Vec2): boolean {
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (Math.abs(cross) > EPS * Math.max(1, Math.hypot(b.x - a.x, b.y - a.y))) return false;
    return p.x >= Math.min(a.x, b.x) - EPS && p.x <= Math.max(a.x, b.x) + EPS
        && p.y >= Math.min(a.y, b.y) - EPS && p.y <= Math.max(a.y, b.y) + EPS;
}

/** Ray casting; a point lying on an edge or vertex counts as inside. */
export function pointInPolygon(p: Vec2, poly: Polygon): boolean {
    const n = poly.length;
    if (n < 3) return false;
    let inside = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const a = poly[i];
        const b = poly[j];
        if (onSegment(p, a, b)) return true;
        if ((a.y > p.y) !== (b.y > p.y)) {
            const xCross = a.x + ((p.y - a.y) * (b.x - a.x)) / (b.y - a.y);
            if (p.x < xCross) inside = !inside;
        }
    }
    return inside;
}

export function distance(a: Vec2, b: Vec2): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
}
