import type { LevelId } from '../data/types';

/** One file of the game: a picture or a sound, the levels that need it (or 'common'). */
export interface AssetEntry { key: string; path: string; kind: 'image' | 'audio'; pixelArt?: boolean; levels: (LevelId | 'common')[] }
export interface Manifest { entries: AssetEntry[] }

const LEVELS = ['L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08', 'common'];

function fail(msg: string): never {
    throw new Error(`assets.json: ${msg}`);
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
        if (e.kind !== 'image' && e.kind !== 'audio') fail(`entry "${e.key}": bad kind "${String(e.kind)}"`);
        if (e.pixelArt !== undefined && typeof e.pixelArt !== 'boolean') fail(`entry "${e.key}": pixelArt must be a boolean`);
        if (!Array.isArray(e.levels) || e.levels.length === 0 || !e.levels.every(l => LEVELS.includes(l as string))) fail(`entry "${e.key}": bad level list`);
        if (keys.has(e.key)) fail(`duplicate key "${e.key}"`);
        keys.add(e.key);
        return { key: e.key, path: e.path, kind: e.kind as AssetEntry['kind'], pixelArt: e.pixelArt as boolean | undefined, levels: e.levels as AssetEntry['levels'] };
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
