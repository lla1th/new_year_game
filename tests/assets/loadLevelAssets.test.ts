import { test, expect, vi, beforeEach } from 'vitest';
import { loadLevelAssets, resetAssetFailures, type AssetSceneLike } from '../../src/game/assets/loadLevelAssets';
import type { Manifest } from '../../src/game/assets/manifest';

/** Fake Phaser scene: files listed in `present` load, the others fail. */
function fakeScene(present: string[]) {
  const textures = new Map<string, { filter?: number }>();
  const audio = new Set<string>();
  const queue: { key: string; kind: 'image' | 'audio' }[] = [];
  const handlers: Record<string, ((...a: unknown[]) => void)[]> = {};
  const scene: AssetSceneLike = {
    load: {
      image: (key: string) => { queue.push({ key, kind: 'image' }); },
      audio: (key: string) => { queue.push({ key, kind: 'audio' }); },
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
      get: (k: string) => ({ setFilter: (f: number) => { textures.get(k)!.filter = f; } }),
    },
    cache: { audio: { exists: (k: string) => audio.has(k) } },
  };
  return { scene, textures, audio };
}

const manifest: Manifest = { entries: [
  { key: 'w1_fair_bg', path: 'img/world1/w1_fair_bg.png', kind: 'image', pixelArt: true, levels: ['L02'] },
  { key: 'w1_typo', path: 'img/world1/w1_fiar_bg.png', kind: 'image', levels: ['L02'] },
  { key: 'w2_factory_bg', path: 'img/world2/w2_factory_bg.webp', kind: 'image', levels: ['L04'] },
  { key: 'sfx_click', path: 'audio/sfx/sfx_click', kind: 'audio', levels: ['common'] },
] };

beforeEach(() => resetAssetFailures());

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
