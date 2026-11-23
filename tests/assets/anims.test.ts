import { describe, test, expect, vi } from 'vitest';
import { animConfigs, asepriteAnimConfigs, createAnims, firstAnimated, showVisual, type AnimConfig } from '../../src/game/assets/anims';
import { parseManifest, dataPath, type AssetEntry } from '../../src/game/assets/manifest';

const sheet = (anims: AssetEntry['anims']): AssetEntry =>
  ({ key: 'hero', path: 'img/hero.png', kind: 'spritesheet', frameWidth: 32, frameHeight: 32, levels: ['L01'], anims });

describe('manifest: animated entries', () => {
  const base = { key: 'hero', path: 'img/hero.png', levels: ['L01'] };

  test('spritesheet needs a frame size', () => {
    expect(() => parseManifest({ entries: [{ ...base, kind: 'spritesheet' }] })).toThrow(/frameWidth/);
    const m = parseManifest({ entries: [{ ...base, kind: 'spritesheet', frameWidth: 32, frameHeight: 48, anims: { walk: { frames: [0, 1] } } }] });
    expect(m.entries[0]).toMatchObject({ frameWidth: 32, frameHeight: 48, anims: { walk: { frames: [0, 1] } } });
  });

  test('bad animations are rejected with a readable message', () => {
    const e = (anims: unknown, kind = 'spritesheet') => ({ entries: [{ ...base, kind, frameWidth: 8, frameHeight: 8, anims }] });
    expect(() => parseManifest(e({ walk: { frames: [] } }))).toThrow(/empty frames/);
    expect(() => parseManifest(e({ walk: { frames: ['a'] } }))).toThrow(/bad frames/);
    expect(() => parseManifest(e({ walk: { frames: [0], frameRate: 0 } }))).toThrow(/frameRate/);
    expect(() => parseManifest(e({ walk: { frames: [0], repeat: -2 } }))).toThrow(/repeat/);
    expect(() => parseManifest(e({ 'шаг': { frames: [0] } }))).toThrow(/latin/);
    expect(() => parseManifest({ entries: [{ ...base, kind: 'image', anims: { walk: { frames: [0] } } }] })).toThrow(/only for/);
    expect(() => parseManifest({ entries: [{ ...base, kind: 'aseprite', anims: { walk: { frames: [0] } } }] })).toThrow(/only for/);
  });

  test('json path of an atlas: explicit `data` or the picture name with .json', () => {
    expect(dataPath({ ...base, kind: 'atlas', levels: ['L01'] })).toBe('img/hero.json');
    expect(dataPath({ ...base, kind: 'atlas', levels: ['L01'], data: 'img/other.json' })).toBe('img/other.json');
  });
});

describe('animation configs', () => {
  test('spritesheet: key = <entry>_<name>, defaults 8 fps and endless loop', () => {
    const [c] = animConfigs(sheet({ dr_walk: { frames: { start: 2, end: 4 } } }));
    expect(c).toEqual({ key: 'hero_dr_walk', frames: [2, 3, 4].map(frame => ({ key: 'hero', frame })), frameRate: 8, repeat: -1, yoyo: false });
  });

  test('atlas: frame names from prefix / zeroPad / suffix', () => {
    const e: AssetEntry = { key: 'tik', path: 'a.png', kind: 'atlas', levels: ['L01'],
      anims: { run: { frames: { prefix: 'run_', start: 1, end: 3, zeroPad: 2, suffix: '.png' }, repeat: 0, yoyo: true } } };
    const [c] = animConfigs(e);
    expect(c.frames.map(f => f.frame)).toEqual(['run_01.png', 'run_02.png', 'run_03.png']);
    expect(c).toMatchObject({ repeat: 0, yoyo: true });
  });

  test('aseprite: tags → animations with frame durations, direction and repeat', () => {
    const e: AssetEntry = { key: 'tik', path: 'a.png', kind: 'aseprite', levels: ['L01'] };
    const json = {
      frames: [{ duration: 100 }, { duration: 150 }, { duration: 200 }],
      meta: { frameTags: [
        { name: 'idle', from: 0, to: 1, direction: 'forward' },
        { name: 'back', from: 0, to: 2, direction: 'reverse', repeat: '2' },
        { name: 'swing', from: 1, to: 2, direction: 'pingpong' },
        { name: 'плохой', from: 0, to: 0 },
      ] },
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cs = asepriteAnimConfigs(e, json);
    warn.mockRestore();
    expect(cs.map(c => c.key)).toEqual(['tik_idle', 'tik_back', 'tik_swing']);
    expect(cs[0]).toMatchObject({ repeat: -1, yoyo: false, frames: [{ frame: '0', duration: 100 }, { frame: '1', duration: 150 }] });
    expect(cs[1].frames.map(f => f.frame)).toEqual(['2', '1', '0']);
    expect(cs[1].repeat).toBe(1);   // «Repeat 2» in Aseprite = played twice
    expect(cs[2].yoyo).toBe(true);
    expect(asepriteAnimConfigs(e, null)).toEqual([]);
  });
});

describe('runtime', () => {
  test('createAnims drops frames the texture does not have and skips empty animations', () => {
    const made = new Map<string, AnimConfig>();
    const scene = { anims: { exists: (k: string) => made.has(k), create: (c: AnimConfig) => made.set(c.key, c) },
      textures: { get: () => ({ has: (f: string | number) => Number(f) < 2 }) } };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const keys = createAnims(scene, sheet({ a: { frames: [0, 1, 5] }, b: { frames: [7] } }));
    warn.mockRestore();
    expect(keys).toEqual(['hero_a']);
    expect(made.get('hero_a')!.frames.map(f => f.frame)).toEqual([0, 1]);
  });

  function fakeSprite(animKeys: string[]) {
    const log: string[] = [];
    const s = {
      scene: { anims: { exists: (k: string) => animKeys.includes(k) } },
      anims: { isPlaying: false, stop: () => { log.push('stop'); s.anims.isPlaying = false; } },
      play: (k: string, ignore?: boolean) => { log.push(`play ${k} ${ignore}`); s.anims.isPlaying = true; },
      setTexture: (k: string) => { log.push(`tex ${k}`); },
    };
    return { s, log };
  }

  test('showVisual: animation if there is one, else the still picture (stopping the animation)', () => {
    const { s, log } = fakeSprite(['hero_walk']);
    expect(showVisual(s, 'hero_walk')).toBe(true);
    expect(showVisual(s, 'hero_idle')).toBe(false);
    expect(log).toEqual(['play hero_walk true', 'stop', 'tex hero_idle']);
  });

  test('firstAnimated picks the first existing animation', () => {
    const scene = { anims: { exists: (k: string) => k === 'b' } };
    expect(firstAnimated(scene, ['a', 'b'])).toBe('b');
    expect(firstAnimated(scene, ['a'])).toBeUndefined();
  });
});
