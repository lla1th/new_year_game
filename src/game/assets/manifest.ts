import type { LevelId } from '../data/types';

/**
 * Frames of one animation:
 * - spritesheet: frame numbers `[0, 1, 2, 1]` or a range `{ "start": 0, "end": 7 }`;
 * - atlas: frame names `["walk_01", "walk_02"]` or `{ "prefix": "walk_", "start": 1, "end": 8, "zeroPad": 2, "suffix": ".png" }`.
 */
export type AnimFrames = (number | string)[] | { start: number; end: number; prefix?: string; suffix?: string; zeroPad?: number };

/** One animation of a spritesheet / atlas. Its key in the game is `<entry key>_<name>`. */
export interface AnimDef {
    frames: AnimFrames;
    /** Frames per second (default 8). */
    frameRate?: number;
    /** -1 = loop forever (default), 0 = play once, N = N extra times. */
    repeat?: number;
    /** Play forward, then backward. */
    yoyo?: boolean;
}

export type AssetKind = 'image' | 'audio' | 'spritesheet' | 'atlas' | 'aseprite';

/** One file of the game: a picture, a sound or an animated sheet, the levels that need it (or 'common'). */
export interface AssetEntry {
    key: string;
    path: string;
    kind: AssetKind;
    pixelArt?: boolean;
    levels: (LevelId | 'common')[];
    /** spritesheet: size of one frame in pixels. */
    frameWidth?: number;
    frameHeight?: number;
    /** atlas / aseprite: path of the JSON (default — `path` with the extension replaced by `.json`). */
    data?: string;
    /** spritesheet / atlas: animations by name (aseprite takes them from its tags). */
    anims?: Record<string, AnimDef>;
}
export interface Manifest { entries: AssetEntry[] }

const LEVELS = ['L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08', 'common'];
const KINDS: AssetKind[] = ['image', 'audio', 'spritesheet', 'atlas', 'aseprite'];

function fail(msg: string): never {
    throw new Error(`assets.json: ${msg}`);
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

function parseAnims(key: string, kind: AssetKind, raw: unknown): Record<string, AnimDef> | undefined {
    if (raw === undefined) return undefined;
    if (kind !== 'spritesheet' && kind !== 'atlas') fail(`entry "${key}": "anims" is only for spritesheet / atlas`);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) fail(`entry "${key}": "anims" must be an object`);
    const out: Record<string, AnimDef> = {};
    for (const [name, a] of Object.entries(raw as Record<string, unknown>)) {
        const where = `entry "${key}", anim "${name}"`;
        if (!/^[A-Za-z0-9_]+$/.test(name)) fail(`${where}: name may contain only latin letters, digits and _`);
        if (typeof a !== 'object' || a === null) fail(`${where}: must be an object`);
        const d = a as Record<string, unknown>;
        const f = d.frames;
        if (Array.isArray(f)) {
            if (f.length === 0) fail(`${where}: empty frames`);
            const ok = kind === 'spritesheet' ? f.every(x => isInt(x) && x >= 0) : f.every(x => typeof x === 'string' || isInt(x));
            if (!ok) fail(`${where}: bad frames`);
        } else if (typeof f === 'object' && f !== null) {
            const r = f as Record<string, unknown>;
            if (!isInt(r.start) || !isInt(r.end) || r.start < 0 || r.end < 0) fail(`${where}: frames range needs integer start / end`);
            if (r.prefix !== undefined && typeof r.prefix !== 'string') fail(`${where}: prefix must be a string`);
            if (r.suffix !== undefined && typeof r.suffix !== 'string') fail(`${where}: suffix must be a string`);
            if (r.zeroPad !== undefined && !isInt(r.zeroPad)) fail(`${where}: zeroPad must be an integer`);
        } else fail(`${where}: no frames`);
        if (d.frameRate !== undefined && !(typeof d.frameRate === 'number' && d.frameRate > 0)) fail(`${where}: frameRate must be > 0`);
        if (d.repeat !== undefined && !(isInt(d.repeat) && d.repeat >= -1)) fail(`${where}: repeat must be -1 or more`);
        if (d.yoyo !== undefined && typeof d.yoyo !== 'boolean') fail(`${where}: yoyo must be a boolean`);
        out[name] = { frames: f as AnimFrames, frameRate: d.frameRate as number | undefined, repeat: d.repeat as number | undefined, yoyo: d.yoyo as boolean | undefined };
    }
    return out;
}

/** Validates public/data/assets.json; throws an Error with a readable message on a wrong structure. */
export function parseManifest(json: unknown): Manifest {
    if (typeof json !== 'object' || json === null || !Array.isArray((json as { entries?: unknown }).entries)) fail('no "entries" array');
    const keys = new Set<string>();
    const entries = (json as { entries: unknown[] }).entries.map((raw, i) => {
        const e = raw as Record<string, unknown>;
        if (typeof e !== 'object' || e === null) fail(`entry #${i} is not an object`);
        if (typeof e.key !== 'string' || !e.key) fail(`entry #${i}: bad key`);
        if (typeof e.path !== 'string' || !e.path) fail(`entry "${e.key}": bad path`);
        if (!KINDS.includes(e.kind as AssetKind)) fail(`entry "${e.key}": bad kind "${String(e.kind)}"`);
        const kind = e.kind as AssetKind;
        if (e.pixelArt !== undefined && typeof e.pixelArt !== 'boolean') fail(`entry "${e.key}": pixelArt must be a boolean`);
        if (!Array.isArray(e.levels) || e.levels.length === 0 || !e.levels.every(l => LEVELS.includes(l as string))) fail(`entry "${e.key}": bad level list`);
        if (keys.has(e.key)) fail(`duplicate key "${e.key}"`);
        keys.add(e.key);
        const out: AssetEntry = { key: e.key, path: e.path, kind, pixelArt: e.pixelArt as boolean | undefined, levels: e.levels as AssetEntry['levels'] };
        if (kind === 'spritesheet') {
            if (!isInt(e.frameWidth) || e.frameWidth <= 0 || !isInt(e.frameHeight) || e.frameHeight <= 0) fail(`entry "${e.key}": spritesheet needs frameWidth and frameHeight (pixels)`);
            out.frameWidth = e.frameWidth;
            out.frameHeight = e.frameHeight;
        }
        if (e.data !== undefined) {
            if (kind !== 'atlas' && kind !== 'aseprite') fail(`entry "${e.key}": "data" is only for atlas / aseprite`);
            if (typeof e.data !== 'string' || !e.data) fail(`entry "${e.key}": bad data path`);
            out.data = e.data;
        }
        const anims = parseAnims(e.key, kind, e.anims);
        if (anims) out.anims = anims;
        return out;
    });
    return { entries };
}

/** The level's own entries plus the common ones. */
export function assetsForLevel(m: Manifest, level: LevelId): AssetEntry[] {
    return m.entries.filter(e => e.levels.includes(level) || e.levels.includes('common'));
}

/** Audio is shipped as .ogg (main) + .m4a (Safari/iOS fallback); the manifest stores the path without extension. */
export function audioUrls(path: string): string[] {
    return [`${path}.ogg`, `${path}.m4a`];
}

/** JSON of an atlas / aseprite entry: `data`, or `path` with its extension replaced by `.json`. */
export function dataPath(e: AssetEntry): string {
    return e.data ?? e.path.replace(/\.[^./]+$/, '') + '.json';
}

/** Kinds that give a texture (everything except audio). */
export function isPicture(kind: AssetKind): boolean {
    return kind !== 'audio';
}
