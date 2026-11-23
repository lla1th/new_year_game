import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseManifest, assetsForLevel, audioUrls } from '../../src/game/assets/manifest';

describe('asset manifest', () => {
  const m = parseManifest({ entries: [
    { key: 'w1_fair_bg', path: 'img/world1/w1_fair_bg.png', kind: 'image', pixelArt: true, levels: ['L02'] },
    { key: 'ui_slot', path: 'img/ui/slot.png', kind: 'image', levels: ['common'] } ] });

  test('entries of a level = its own + common', () => {
    expect(assetsForLevel(m, 'L02').map(e => e.key).sort()).toEqual(['ui_slot', 'w1_fair_bg']);
    expect(assetsForLevel(m, 'L04').map(e => e.key)).toEqual(['ui_slot']);
  });

  test('invalid structure throws', () => {
    expect(() => parseManifest({ entries: [{ key: 1 }] })).toThrow();
    expect(() => parseManifest({})).toThrow();
    expect(() => parseManifest({ entries: [{ key: 'a', path: 'x', kind: 'video', levels: ['L01'] }] })).toThrow(/kind/);
    expect(() => parseManifest({ entries: [{ key: 'a', path: 'x', kind: 'image', levels: ['L09'] }] })).toThrow(/level/);
    expect(() => parseManifest({ entries: [
      { key: 'a', path: 'x', kind: 'image', levels: ['L01'] }, { key: 'a', path: 'y', kind: 'image', levels: ['L02'] }] })).toThrow(/duplicate/);
  });

  test('audio: .ogg first, .m4a fallback', () => {
    expect(audioUrls('audio/sfx/sfx_click')).toEqual(['audio/sfx/sfx_click.ogg', 'audio/sfx/sfx_click.m4a']);
  });

  test('the real manifest parses and covers every level', () => {
    const real = parseManifest(JSON.parse(readFileSync(new URL('../../public/data/assets.json', import.meta.url), 'utf8')));
    for (const l of ['L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08'] as const) {
      expect(assetsForLevel(real, l).some(e => e.key.endsWith('_bg')), l).toBe(true);
    }
    for (const id of ['mus_menu', 'mus_world1', 'mus_world2', 'mus_world3', 'mus_finale', 'sfx_click', 'sfx_transition', 'amb_fair']) {
      expect(real.entries.find(e => e.key === id)?.kind, id).toBe('audio');
    }
    // world 1 images are pixel art, the others are not
    for (const e of real.entries.filter(x => x.kind === 'image')) {
      if (e.path.startsWith('img/world1/')) expect(e.pixelArt, e.key).toBe(true);
      if (e.path.startsWith('img/world2/') || e.path.startsWith('img/world3/') || e.path.startsWith('img/finale/')) expect(e.pixelArt ?? false, e.key).toBe(false);
    }
  });
});
