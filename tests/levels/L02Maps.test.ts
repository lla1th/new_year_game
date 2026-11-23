import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseTiledMap } from '../../src/game/map/parseTiledMap';
import { NavGrid } from '../../src/game/nav/NavGrid';

const EXPECTED: Record<string, string[]> = {
  L02_gate: ['chain', 'crate', 'gate', 'pole', 'poster', 'urn'],
  L02_entrance: ['booth', 'exit_gate', 'exit_right', 'frozen_walkers', 'lantern', 'vendor', 'walkers'],
  L02_square: ['bulb_blue', 'carousel', 'exit_left', 'radio', 'shed_door', 'snowdrift', 'snowman', 'tent'],
  L02_shed: ['barrel', 'exit_shed', 'generator'],
  L02_tent: ['exit_tent', 'nika', 'teleporter'],
};

describe('L02 maps', () => {
  for (const [file, ids] of Object.entries(EXPECTED)) {
    test(`${file}: parses, has its hotspots, points and approaches are walkable`, () => {
      const m = parseTiledMap(JSON.parse(readFileSync(new URL(`../../public/assets/maps/${file}.json`, import.meta.url), 'utf8')));
      expect(m.levelId).toBe('L02');
      expect(m.hotspots.map(h => h.id).sort()).toEqual(ids);
      const nav = new NavGrid(m.walkable, m.blockers);
      expect(nav.isWalkable(m.points.spawn)).toBe(true);
      expect(nav.isWalkable(m.points.spitz_spawn)).toBe(true);
      for (const h of m.hotspots) expect(nav.isWalkable(h.approach), h.id).toBe(true);
    });
  }
});
