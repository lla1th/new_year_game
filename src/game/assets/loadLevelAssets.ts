import type { LevelId } from '../data/types';
import { assetsForLevel, audioUrls, type Manifest } from './manifest';

/** NEAREST texture filtering (Phaser.Textures.FilterMode.NEAREST = 1, checked in phaser/src/textures/const.js). */
const FILTER_NEAREST = 1;

/* eslint-disable @typescript-eslint/no-explicit-any */
/** The part of a Phaser scene this loader needs (kept small so it can be tested without Phaser). */
export interface AssetSceneLike {
    load: {
        image(key: string, url: string): unknown;
        audio(key: string, urls: string[]): unknown;
        on(ev: string, fn: (...a: any[]) => void): unknown;
        off(ev: string, fn: (...a: any[]) => void): unknown;
        once(ev: string, fn: (...a: any[]) => void): unknown;
        start(): unknown;
    };
    textures: { exists(key: string): boolean; get(key: string): { setFilter(mode: number): unknown } };
    cache: { audio: { exists(key: string): boolean } };
}

/** Keys already reported as missing (warn once per key). */
const reported = new Set<string>();
/** Keys whose files failed once: not requested again in this session. */
const failed = new Set<string>();

/** A response that really is a file of this kind (a dev server answers missing files with 200 + index.html). */
export function isRealFile(res: { ok: boolean; headers: { get(name: string): string | null } }, kind: 'image' | 'audio'): boolean {
    if (!res.ok) return false;
    const type = (res.headers.get('content-type') ?? '').toLowerCase();
    if (type.includes('text/html')) return false;
    if (kind === 'image') return type.startsWith('image/');
    return type.startsWith('audio/') || type.startsWith('video/') || type.includes('octet-stream') || type.includes('ogg');
}

/** Results of the existence check, per URL, for the whole session. */
const probed = new Map<string, Promise<boolean>>();

function httpProbe(kind: 'image' | 'audio') {
    return (url: string): Promise<boolean> => {
        let p = probed.get(url);
        if (!p) {
            p = fetch(url, { method: 'HEAD' }).then(r => isRealFile(r, kind)).catch(() => false);
            probed.set(url, p);
        }
        return p;
    };
}

/**
 * Loads the level's (and common) files that are not in the cache yet. A missing file never stops the game:
 * its key is returned in `missing` (with one console warning) and ensureTexture draws a placeholder later.
 * Files are checked with a HEAD request first, so missing ones never reach the Phaser loader (no decode errors).
 * Pixel art pictures get NEAREST filtering (world 1 only — not global).
 */
export async function loadLevelAssets(
    scene: AssetSceneLike, level: LevelId, manifest: Manifest, probe?: (url: string, kind: 'image' | 'audio') => Promise<boolean>,
): Promise<{ missing: string[] }> {
    const wanted = assetsForLevel(manifest, level).filter(e =>
        !failed.has(e.key) && (e.kind === 'image' ? !scene.textures.exists(e.key) : !scene.cache.audio.exists(e.key)));
    if (wanted.length === 0) return { missing: [] };
    const base = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.BASE_URL : '/';
    const check = probe ?? ((url: string, kind: 'image' | 'audio') => httpProbe(kind)(url));
    const missing: string[] = [];
    const queue: { key: string; kind: 'image' | 'audio'; urls: string[]; pixelArt?: boolean }[] = [];
    await Promise.all(wanted.map(async e => {
        const urls = e.kind === 'image' ? [`${base}assets/${e.path}`] : audioUrls(`${base}assets/${e.path}`);
        const ok = await Promise.all(urls.map(u => check(u, e.kind)));
        const present = urls.filter((_, i) => ok[i]);
        if (present.length === 0) missing.push(e.key);
        else queue.push({ key: e.key, kind: e.kind, urls: present, pixelArt: e.pixelArt });
    }));
    if (queue.length > 0) {
        await new Promise<void>(resolve => {
            scene.load.once('complete', () => resolve());
            for (const q of queue) {
                if (q.kind === 'image') scene.load.image(q.key, q.urls[0]);
                else scene.load.audio(q.key, q.urls);
            }
            scene.load.start();
        });
        for (const q of queue) {
            const ok = q.kind === 'image' ? scene.textures.exists(q.key) : scene.cache.audio.exists(q.key);
            if (!ok) missing.push(q.key);   // present but broken (e.g. a corrupt file)
            else if (q.kind === 'image' && q.pixelArt) scene.textures.get(q.key).setFilter(FILTER_NEAREST);
        }
    }
    for (const k of missing) failed.add(k);
    const fresh = missing.filter(k => !reported.has(k));
    if (fresh.length) {
        fresh.forEach(k => reported.add(k));
        console.warn(`[assets] ${fresh.length} file(s) missing, placeholders are used: ${fresh.join(', ')}`);
    }
    return { missing };
}

/** Test helper: forget what failed before. */
export function resetAssetFailures(): void {
    failed.clear();
    probed.clear();
    reported.clear();
}
