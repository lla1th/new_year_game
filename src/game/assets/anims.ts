import type { AnimDef, AnimFrames, AssetEntry } from './manifest';

/**
 * Frame animations of the game.
 *
 * Naming: an animation is called `<entry key>_<name>` — for a spritesheet entry `ksyusha_w1` with the
 * animation `dr_walk` the game key is `ksyusha_w1_dr_walk`. For Aseprite files `<name>` is the tag name.
 * Wherever the game shows a picture by key (Ksyusha's poses, the spitz, sprites of the Tiled map),
 * it first looks for an animation with this key and plays it; if there is none, it shows the still picture
 * (or its placeholder) — see showVisual().
 */

export const DEFAULT_FRAME_RATE = 8;

/** The part of Phaser's animation config this module produces (same field names as Phaser). */
export interface AnimConfig {
    key: string;
    frames: { key: string; frame: string | number; duration?: number }[];
    frameRate?: number;
    repeat: number;
    yoyo: boolean;
}

/** Game key of the animation `name` of the entry `entryKey`. */
export function animKey(entryKey: string, name: string): string {
    return `${entryKey}_${name}`;
}

function expandFrames(f: AnimFrames, kind: AssetEntry['kind']): (string | number)[] {
    if (Array.isArray(f)) return kind === 'spritesheet' ? f : f.map(String);
    const out: (string | number)[] = [];
    const step = f.end >= f.start ? 1 : -1;
    for (let i = f.start; ; i += step) {
        out.push(kind === 'spritesheet' ? i : `${f.prefix ?? ''}${String(i).padStart(f.zeroPad ?? 0, '0')}${f.suffix ?? ''}`);
        if (i === f.end) break;
    }
    return out;
}

function config(entryKey: string, kind: AssetEntry['kind'], name: string, a: AnimDef): AnimConfig {
    return {
        key: animKey(entryKey, name),
        frames: expandFrames(a.frames, kind).map(frame => ({ key: entryKey, frame })),
        frameRate: a.frameRate ?? DEFAULT_FRAME_RATE,
        repeat: a.repeat ?? -1,
        yoyo: a.yoyo ?? false,
    };
}

/** Animations described in the manifest (spritesheet / atlas). */
export function animConfigs(e: AssetEntry): AnimConfig[] {
    if (!e.anims || (e.kind !== 'spritesheet' && e.kind !== 'atlas')) return [];
    return Object.entries(e.anims).map(([name, a]) => config(e.key, e.kind, name, a));
}

interface AsepriteTag { name?: string; from?: number; to?: number; direction?: string; repeat?: string | number }

/**
 * Animations from the tags of an Aseprite JSON export (File → Export Sprite Sheet, «Item Filename» = `{frame}`,
 * Meta: Tags). Frame durations come from the file. A tag loops forever unless its «Repeat» is set in Aseprite.
 * Directions: forward, reverse, pingpong (pingpong_reverse is played as pingpong).
 */
export function asepriteAnimConfigs(e: AssetEntry, json: unknown): AnimConfig[] {
    const data = json as { frames?: unknown; meta?: { frameTags?: AsepriteTag[] } } | null;
    if (!data || typeof data !== 'object' || !data.frames || !data.meta) return [];
    const frames = data.frames as Record<string, { duration?: number }> | { duration?: number }[];
    const at = (i: number) => (Array.isArray(frames) ? frames[i] : frames[String(i)]);
    const out: AnimConfig[] = [];
    for (const tag of data.meta.frameTags ?? []) {
        if (!tag.name || !/^[A-Za-z0-9_]+$/.test(tag.name)) {
            console.warn(`[anims] ${e.key}: Aseprite tag "${String(tag.name)}" skipped — use latin letters, digits and _`);
            continue;
        }
        const list: AnimConfig['frames'] = [];
        for (let i = tag.from ?? 0; i <= (tag.to ?? 0); i++) {
            const f = at(i);
            if (f) list.push({ key: e.key, frame: String(i), duration: f.duration });
        }
        if (tag.direction === 'reverse') list.reverse();
        const times = Number(tag.repeat);
        out.push({
            key: animKey(e.key, tag.name),
            frames: list,
            repeat: Number.isInteger(times) && times > 0 ? times - 1 : -1,
            yoyo: tag.direction === 'pingpong' || tag.direction === 'pingpong_reverse',
        });
    }
    return out;
}

// --- runtime -------------------------------------------------------------------------------

/** The part of a Phaser scene needed to create animations (small, so it can be tested without Phaser). */
export interface AnimSceneLike {
    anims: { exists(key: string): boolean; create(config: AnimConfig): unknown };
    textures: { get(key: string): { has(frame: string | number): boolean } };
}

/** Animation key → the manifest entry it was made from (to know e.g. whether it is pixel art). */
const owners = new Map<string, AssetEntry>();

/** Manifest entry an animation key belongs to. */
export function animOwner(key: string): AssetEntry | undefined {
    return owners.get(key);
}

/**
 * Creates the entry's animations (global, once per game). Frames missing in the texture are dropped with
 * a warning; an animation without any frame is not created. Returns the keys of the created animations.
 */
export function createAnims(scene: AnimSceneLike, e: AssetEntry, asepriteJson?: unknown): string[] {
    const configs = e.kind === 'aseprite' ? asepriteAnimConfigs(e, asepriteJson) : animConfigs(e);
    const tex = scene.textures.get(e.key);
    const made: string[] = [];
    for (const c of configs) {
        if (scene.anims.exists(c.key)) { owners.set(c.key, e); continue; }
        const frames = c.frames.filter(f => tex.has(f.frame));
        if (frames.length < c.frames.length) {
            const lost = c.frames.filter(f => !tex.has(f.frame)).map(f => f.frame);
            console.warn(`[anims] ${c.key}: no frames ${lost.join(', ')} in "${e.key}"`);
        }
        if (frames.length === 0) continue;
        scene.anims.create({ ...c, frames });
        owners.set(c.key, e);
        made.push(c.key);
    }
    return made;
}

/** Test helper. */
export function resetAnimOwners(): void {
    owners.clear();
}

/** The part of a Phaser Sprite showVisual() needs. */
export interface VisualLike {
    scene: { anims: { exists(key: string): boolean } };
    anims: { isPlaying: boolean; stop(): unknown };
    play(key: string, ignoreIfPlaying?: boolean): unknown;
    setTexture(key: string): unknown;
}

/**
 * Shows `key` on the sprite: plays the animation with this key if there is one (keeps it running if it
 * already plays), otherwise stops any animation and shows the still picture `key`. Returns true if animated.
 */
export function showVisual(sprite: VisualLike, key: string): boolean {
    if (sprite.scene.anims.exists(key)) {
        sprite.play(key, true);
        return true;
    }
    if (sprite.anims.isPlaying) sprite.anims.stop();
    sprite.setTexture(key);
    return false;
}

/** The first of `keys` that has an animation, or undefined. */
export function firstAnimated(scene: { anims: { exists(key: string): boolean } }, keys: string[]): string | undefined {
    return keys.find(k => scene.anims.exists(k));
}
