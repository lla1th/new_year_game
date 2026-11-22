import { describe, test, expect } from 'vitest';
import { parseTiledMap } from '../../src/game/map/parseTiledMap';
import fixture from '../fixtures/test-map.json';

describe('parseTiledMap', () => {
  const map = parseTiledMap(fixture);

  test('map properties', () => {
    expect(map.levelId).toBe('TEST');
    expect(map.background).toBe('img/test_bg.png');
    expect(map.pixelArt).toBe(false);
    expect(map.footsteps).toBe('floor');
    expect(map.music).toBe('mus_menu');
  });
  test('walkable polygon points are converted from relative to absolute', () => {
    expect(map.walkable[0][2]).toEqual({ x: 1800, y: 1000 });
  });
  test('rectangle blocker becomes a polygon', () => {
    expect(map.blockers[0]).toEqual([{ x: 800, y: 600 }, { x: 1000, y: 600 }, { x: 1000, y: 800 }, { x: 800, y: 800 }]);
  });
  test('hotspot', () => {
    expect(map.hotspots[0]).toMatchObject({ id: 'sofa', approach: { x: 700, y: 700 }, facing: 'dr', cursor: 'hand' });
  });
  test('points', () => {
    expect(map.points.spawn).toEqual({ x: 300, y: 800 });
  });
  test('sprites', () => {
    expect(map.sprites[0]).toEqual({ name: 'lamp', texture: 'lamp', pos: { x: 1200, y: 640 }, depthY: 650 });
  });
  test('missing required layer throws with its name', () => {
    expect(() => parseTiledMap({ ...fixture, layers: [] })).toThrow(/walkable/);
  });
  test('missing map property throws with its name', () => {
    expect(() => parseTiledMap({ ...fixture, properties: fixture.properties.filter(p => p.name !== 'music') })).toThrow(/music/);
  });
  test('optional layers default to empty arrays', () => {
    const layers = fixture.layers.filter(l => l.name !== 'blockers' && l.name !== 'sprites');
    const m = parseTiledMap({ ...fixture, layers });
    expect(m.blockers).toEqual([]);
    expect(m.sprites).toEqual([]);
  });
});
