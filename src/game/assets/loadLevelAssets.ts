import type { LevelId } from '../data/types';
import { createAnims, type AnimConfig } from './anims';
import { assetsForLevel, audioUrls, dataPath, isPicture, type AssetEntry, type Manifest } from './manifest';

/** NEAREST texture filtering (Phaser.Textures.FilterMode.NEAREST = 1, checked in phaser/src/textures/const.js). */
const FILTER_NEAREST = 1;

/* eslint-disable @typescript-eslint/no-explicit-any */
/** The part of a Phaser scene this loader needs (kept small so it can be tested without Phaser). */
export interface AssetSceneLike {
    load: {
        image(key: string, url: string): unknown;
        audio(key: string, urls: string[]): unknown;
        spritesheet(key: string, url: string, frame: { frameWidth: number; frameHeight: number }): unknown;
        atlas(key: string, textureURL: string, atlasURL: string): unknown;
        aseprite(key: string, textureURL: string, atlasURL: string): unknown;
        on(ev: string, fn: (...a: any[]) => void): unknown;
        off(ev: string, fn: (...a: any[]) => void): unknown;
        once(ev: string, fn: (...a: any[]) => void): unknown;
        start(): unknown;
    };
    textures: { exists(key: string): boolean; get(key: string): { setFilter(mode: number): unknown; has(frame: string | number): boolean } };
    cache: { audio: { exists(key: string): boolean }; json: { get(key: string): unknown } };
    anims: { exists(key: string): boolean; create(config: AnimConfig): unknown };
}

/** Keys already reported as missing (warn once per key). */
const reported = new Set<string>();
/** Keys whose files failed once: not requested again in this session. */
const failed = new Set<string>();

/** What a probed URL must be. */
export type ProbeKind = 'image' | 'audio' | 'json';

/** A response that really is a file of this kind (a dev server answers missing files with 200 + index.html). */
export function isRealFile(res: { ok: boolean; headers: { get(name: string): string | null } }, kind: ProbeKind): boolean {
    if (!res.ok) return false;
    const type = (res.headers.get('content-type') ?? '').toLowerCase();
    if (type.includes('text/html')) return false;
    if (kind === 'image') return type.startsWith('image/');
    if (kind === 'json') return type.includes('json') || type.includes('octet-stream') || type.startsWith('text/plain');
    return type.startsWith('audio/') || type.startsWith('video/') || type.includes('octet-stream') || type.includes('ogg');
}

/** Results of the existence check, per URL, for the whole session. */
const probed = new Map<string, Promise<boolean>>();

function httpProbe(kind: ProbeKind) {
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
    scene: AssetSceneLike, level: LevelId, manifest: Manifest, probe?: (url: string, kind: ProbeKind) => Promise<boolean>,
    onProgress?: (p: number) => void,
): Promise<{ missing: string[] }> {
    const wanted = assetsForLevel(manifest, level).filter(e =>
        !failed.has(e.key) && (isPicture(e.kind) ? !scene.textures.exists(e.key) : !scene.cache.audio.exists(e.key)));
    if (wanted.length === 0) return { missing: [] };
    const base = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.BASE_URL : '/';
    const check = probe ?? ((url: string, kind: ProbeKind) => httpProbe(kind)(url));
    const missing: string[] = [];
    const queue: { e: AssetEntry; urls: string[] }[] = [];
    let checked = 0;
    await Promise.all(wanted.map(async e => {
        const ok = await filesPresent(e, base, check);
        if (ok.length === 0) missing.push(e.key);
        else queue.push({ e, urls: ok });
        onProgress?.(0.2 * (++checked / wanted.length));   // checking: first 20 %
    }));
    if (queue.length > 0) {
        await new Promise<void>(resolve => {
            const onLoad = (v: number) => onProgress?.(0.2 + 0.8 * v);
            scene.load.on('progress', onLoad);
            scene.load.once('complete', () => { scene.load.off('progress', onLoad); resolve(); });
            for (const { e, urls } of queue) {
                if (e.kind === 'image') scene.load.image(e.key, urls[0]);
                else if (e.kind === 'audio') scene.load.audio(e.key, urls);
                else if (e.kind === 'spritesheet') scene.load.spritesheet(e.key, urls[0], { frameWidth: e.frameWidth!, frameHeight: e.frameHeight! });
                else if (e.kind === 'atlas') scene.load.atlas(e.key, urls[0], urls[1]);
                else scene.load.aseprite(e.key, urls[0], urls[1]);
            }
            scene.load.start();
        });
        for (const { e } of queue) {
            const ok = isPicture(e.kind) ? scene.textures.exists(e.key) : scene.cache.audio.exists(e.key);
            if (!ok) { missing.push(e.key); continue; }   // present but broken (e.g. a corrupt file)
            if (isPicture(e.kind) && e.pixelArt) scene.textures.get(e.key).setFilter(FILTER_NEAREST);
            if (e.kind !== 'image' && e.kind !== 'audio') createAnims(scene, e, e.kind === 'aseprite' ? scene.cache.json.get(e.key) : undefined);
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

/**
 * URLs of the entry that exist. Audio: the formats that are there (any one is enough).
 * Atlas / aseprite: [picture, json] — both are needed, otherwise nothing.
 */
async function filesPresent(e: AssetEntry, base: string, check: (url: string, kind: ProbeKind) => Promise<boolean>): Promise<string[]> {
    const url = (p: string) => `${base}assets/${p}`;
    if (e.kind === 'audio') {
        const urls = audioUrls(url(e.path));
        const ok = await Promise.all(urls.map(u => check(u, 'audio')));
        return urls.filter((_, i) => ok[i]);
    }
    if (e.kind === 'atlas' || e.kind === 'aseprite') {
        const urls = [url(e.path), url(dataPath(e))];
        const [img, json] = await Promise.all([check(urls[0], 'image'), check(urls[1], 'json')]);
        return img && json ? urls : [];
    }
    return (await check(url(e.path), 'image')) ? [url(e.path)] : [];
}

/** Test helper: forget what failed before. */
export function resetAssetFailures(): void {
    failed.clear();
    probed.clear();
    reported.clear();
}
