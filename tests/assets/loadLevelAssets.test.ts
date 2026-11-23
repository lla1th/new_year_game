import { test, expect, vi, beforeEach } from 'vitest';
import { loadLevelAssets, resetAssetFailures, type AssetSceneLike } from '../../src/game/assets/loadLevelAssets';
import type { Manifest } from '../../src/game/assets/manifest';
import { animOwner, resetAnimOwners, type AnimConfig } from '../../src/game/assets/anims';

/** Fake Phaser scene: files listed in `present` load, the others fail. Sheets get `frames` frames named 0..N-1. */
function fakeScene(present: string[], frames = 8, json: Record<string, unknown> = {}) {
  const textures = new Map<string, { filter?: number }>();
  const audio = new Set<string>();
  const anims = new Map<string, AnimConfig>();
  const queue: { key: string; kind: 'image' | 'audio'; args: unknown[] }[] = [];
  const calls: { method: string; args: unknown[] }[] = [];
  const handlers: Record<string, ((...a: unknown[]) => void)[]> = {};
  const push = (method: string, kind: 'image' | 'audio') => (key: string, ...args: unknown[]) => {
    calls.push({ method, args: [key, ...args] });
    queue.push({ key, kind, args });
  };
  const scene: AssetSceneLike = {
    load: {
      image: push('image', 'image'),
      audio: push('audio', 'audio'),
      spritesheet: push('spritesheet', 'image'),
      atlas: push('atlas', 'image'),
      aseprite: push('aseprite', 'image'),
      on: (ev: string, fn: (...a: unknown[]) => void) => { (handlers[ev] ??= []).push(fn); },
      off: () => {},
      once: (ev: string, fn: (...a: unknown[]) => void) => { (handlers[ev] ??= []).push(fn); },
      start: () => {
        for (const q of queue.splice(0)) {
          if (present.includes(q.key)) { if (q.kind === 'image') textures.set(q.key, {}); else audio.add(q.key); }
          else (handlers.loaderror ?? []).forEach(h => h({ key: q.key }));
        }
        (handlers.complete ?? []).forEach(h => h());
      },
    },
    textures: {
      exists: (k: string) => textures.has(k),
      get: (k: string) => ({
        setFilter: (f: number) => { textures.get(k)!.filter = f; },
        has: (f: string | number) => Number(f) >= 0 && Number(f) < frames,
      }),
    },
    cache: { audio: { exists: (k: string) => audio.has(k) }, json: { get: (k: string) => json[k] } },
    anims: { exists: (k: string) => anims.has(k), create: (c: AnimConfig) => { anims.set(c.key, c); } },
  };
  return { scene, textures, audio, anims, calls };
}

const manifest: Manifest = { entries: [
  { key: 'w1_fair_bg', path: 'img/world1/w1_fair_bg.png', kind: 'image', pixelArt: true, levels: ['L02'] },
  { key: 'w1_typo', path: 'img/world1/w1_fiar_bg.png', kind: 'image', levels: ['L02'] },
  { key: 'w2_factory_bg', path: 'img/world2/w2_factory_bg.webp', kind: 'image', levels: ['L04'] },
  { key: 'sfx_click', path: 'audio/sfx/sfx_click', kind: 'audio', levels: ['common'] },
] };

beforeEach(() => { resetAssetFailures(); resetAnimOwners(); });

test('a manifest entry whose file is missing → listed as missing with a warning; nothing throws', async () => {
  const { scene, textures } = fakeScene(['w1_fair_bg']);
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const r = await loadLevelAssets(scene, 'L02', manifest, async () => true);
  expect(r.missing.sort()).toEqual(['sfx_click', 'w1_typo']);
  expect(warn).toHaveBeenCalled();
  expect(textures.get('w1_fair_bg')?.filter).toBe(1);   // pixel art → NEAREST
  warn.mockRestore();
});

test('files that do not exist are not handed to the Phaser loader at all (no decode errors)', async () => {
  const { scene } = fakeScene(['w1_fair_bg', 'w1_typo', 'sfx_click']);
  const requested: string[] = [];
  const orig = scene.load.image;
  scene.load.image = (key: string, url: string) => { requested.push(key); return orig(key, url); };
  const probe = async (url: string) => !url.includes('w1_fiar_bg') && !url.includes('sfx_click');
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const r = await loadLevelAssets(scene, 'L02', manifest, probe);
  expect(requested).toEqual(['w1_fair_bg']);
  expect(r.missing.sort()).toEqual(['sfx_click', 'w1_typo']);
  warn.mockRestore();
});

test('isRealFile: HTML answers (dev server fallback) and HTTP errors are not files', async () => {
  const { isRealFile } = await import('../../src/game/assets/loadLevelAssets');
  const res = (status: number, type: string) => ({ ok: status < 400, headers: { get: () => type } });
  expect(isRealFile(res(200, 'image/png') as never, 'image')).toBe(true);
  expect(isRealFile(res(200, 'text/html') as never, 'image')).toBe(false);
  expect(isRealFile(res(404, 'image/png') as never, 'image')).toBe(false);
  expect(isRealFile(res(200, 'audio/ogg') as never, 'audio')).toBe(true);
  expect(isRealFile(res(200, 'video/mp4') as never, 'audio')).toBe(true);    // .m4a is sometimes served as video/mp4
  expect(isRealFile(res(200, 'application/octet-stream') as never, 'audio')).toBe(true);
});

test('already loaded files are not requested again; other levels are not loaded', async () => {
  const { scene, textures } = fakeScene(['w1_fair_bg', 'w1_typo', 'sfx_click', 'w2_factory_bg']);
  await loadLevelAssets(scene, 'L02', manifest, async () => true);
  expect(textures.has('w2_factory_bg')).toBe(false);
  const r = await loadLevelAssets(scene, 'L02', manifest, async () => true);
  expect(r.missing).toEqual([]);
});

test('spritesheet: loaded with its frame size, animations created as <key>_<name>, pixel art → NEAREST', async () => {
  const m: Manifest = { entries: [{
    key: 'ksyusha_w1', path: 'img/characters/ksyusha_w1.png', kind: 'spritesheet', frameWidth: 48, frameHeight: 56, pixelArt: true, levels: ['L01'],
    anims: { dr_idle: { frames: [0, 1, 2, 1], frameRate: 4 }, dr_walk: { frames: { start: 3, end: 7 } } },
  }] };
  const { scene, textures, anims, calls } = fakeScene(['ksyusha_w1']);
  const r = await loadLevelAssets(scene, 'L01', m, async () => true);
  expect(r.missing).toEqual([]);
  expect(calls[0]).toEqual({ method: 'spritesheet', args: ['ksyusha_w1', '/assets/img/characters/ksyusha_w1.png', { frameWidth: 48, frameHeight: 56 }] });
  expect(textures.get('ksyusha_w1')?.filter).toBe(1);
  expect([...anims.keys()].sort()).toEqual(['ksyusha_w1_dr_idle', 'ksyusha_w1_dr_walk']);
  expect(anims.get('ksyusha_w1_dr_walk')!.frames.map(f => f.frame)).toEqual([3, 4, 5, 6, 7]);
  expect(animOwner('ksyusha_w1_dr_walk')?.pixelArt).toBe(true);
});

test('atlas / aseprite: picture + json are both required; json defaults to the same name', async () => {
  const m: Manifest = { entries: [
    { key: 'tik', path: 'img/world1/tik.png', kind: 'aseprite', levels: ['L01'] },
    { key: 'tak', path: 'img/world1/tak.png', kind: 'atlas', levels: ['L01'], anims: { run: { frames: ['0', '1'] } } },
  ] };
  const json = { tik: { frames: { 0: { duration: 100 }, 1: { duration: 200 } }, meta: { frameTags: [{ name: 'run', from: 0, to: 1 }] } } };
  const { scene, anims, calls } = fakeScene(['tik', 'tak'], 2, json);
  const probe = async (url: string) => url !== '/assets/img/world1/tak.json';
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const r = await loadLevelAssets(scene, 'L01', m, probe);
  warn.mockRestore();
  expect(r.missing).toEqual(['tak']);   // its json is missing
  expect(calls).toEqual([{ method: 'aseprite', args: ['tik', '/assets/img/world1/tik.png', '/assets/img/world1/tik.json'] }]);
  expect(anims.get('tik_run')!.frames).toEqual([{ key: 'tik', frame: '0', duration: 100 }, { key: 'tik', frame: '1', duration: 200 }]);
});

test('isRealFile: json', async () => {
  const { isRealFile } = await import('../../src/game/assets/loadLevelAssets');
  const res = (type: string) => ({ ok: true, headers: { get: () => type } });
  expect(isRealFile(res('application/json') as never, 'json')).toBe(true);
  expect(isRealFile(res('text/html') as never, 'json')).toBe(false);
});
