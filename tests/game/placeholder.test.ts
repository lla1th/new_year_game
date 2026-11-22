import { describe, test, expect, vi } from 'vitest';
import type { Scene } from 'phaser';
import { colorFromKey, ensureTexture } from '../../src/game/assets/placeholder';
import { isDebug } from '../../src/game/debug';

function fakeScene(existing: string[] = []) {
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '',
    fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(), strokeText: vi.fn(),
  };
  const tex = { context: ctx, refresh: vi.fn() };
  const keys = new Set(existing);
  const textures = {
    exists: vi.fn((k: string) => keys.has(k)),
    createCanvas: vi.fn((k: string) => { keys.add(k); return tex; }),
  };
  return { scene: { textures } as unknown as Scene, textures, tex, ctx };
}

describe('ensureTexture', () => {
  test('missing texture (e.g. background image failed to load) → placeholder with label', () => {
    const { scene, textures, tex, ctx } = fakeScene();
    expect(ensureTexture(scene, 'bg:img/test_bg.png', 1920, 1080, 'img/test_bg.png')).toBe('bg:img/test_bg.png');
    expect(textures.createCanvas).toHaveBeenCalledWith('bg:img/test_bg.png', 1920, 1080);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
    expect(ctx.fillText).toHaveBeenCalledWith('img/test_bg.png', 960, 540, 1912);
    expect(tex.refresh).toHaveBeenCalled();
  });

  test('existing texture is left untouched', () => {
    const { scene, textures } = fakeScene(['lamp']);
    expect(ensureTexture(scene, 'lamp', 64, 128, 'lamp')).toBe('lamp');
    expect(textures.createCanvas).not.toHaveBeenCalled();
  });

  test('second call does not recreate', () => {
    const { scene, textures } = fakeScene();
    ensureTexture(scene, 'k', 10, 10, 'k');
    ensureTexture(scene, 'k', 10, 10, 'k');
    expect(textures.createCanvas).toHaveBeenCalledTimes(1);
  });

  test('colour is deterministic per key', () => {
    expect(colorFromKey('lamp')).toBe(colorFromKey('lamp'));
    expect(colorFromKey('lamp')).not.toBe(colorFromKey('sofa'));
    expect(colorFromKey('x')).toBeGreaterThanOrEqual(0);
    expect(colorFromKey('x')).toBeLessThanOrEqual(0xffffff);
  });
});

describe('isDebug', () => {
  test('reads ?debug=1', () => {
    expect(isDebug('?debug=1')).toBe(true);
    expect(isDebug('?a=2&debug=1')).toBe(true);
    expect(isDebug('?debug=0')).toBe(false);
    expect(isDebug('')).toBe(false);
  });
});
