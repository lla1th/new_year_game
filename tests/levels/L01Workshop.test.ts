import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseTiledMap } from '../../src/game/map/parseTiledMap';
import { NavGrid } from '../../src/game/nav/NavGrid';

const map = parseTiledMap(JSON.parse(readFileSync(new URL('../../public/assets/maps/L01_workshop.json', import.meta.url), 'utf8')));
const nav = new NavGrid(map.walkable, map.blockers);

describe('L01 workshop map', () => {
  test('parses, and has all hotspots of the workshop', () => {
    expect(map.levelId).toBe('L01');
    expect(map.hotspots.map(h => h.id).sort()).toEqual(['bench', 'board', 'clock', 'door', 'pendulum', 'snail', 'tak', 'tik']);
  });
  test('spawn points and every approach point are walkable', () => {
    expect(nav.isWalkable(map.points.spawn)).toBe(true);
    expect(nav.isWalkable(map.points.spitz_spawn)).toBe(true);
    for (const h of map.hotspots) expect(nav.isWalkable(h.approach), h.id).toBe(true);
  });
  test('the helpers are placed as sprites with placeholder textures', () => {
    expect(map.sprites.map(s => s.texture).sort()).toEqual(['l01b_pendulum', 'l01b_snail', 'l01b_tak', 'l01b_tik']);
  });
});
