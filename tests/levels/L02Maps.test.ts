import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { animConfigs } from '../../src/game/assets/anims';
import { parseManifest } from '../../src/game/assets/manifest';
import { parseTiledMap } from '../../src/game/map/parseTiledMap';
import { NavGrid } from '../../src/game/nav/NavGrid';

const EXPECTED: Record<string, string[]> = {
  L02_gate: ['chain', 'crate', 'gate', 'pole', 'poster', 'urn'],
  L02_entrance: ['booth', 'exit_gate', 'exit_right', 'frozen_walkers', 'lantern', 'vendor', 'walkers'],
  L02_square: ['bulb_blue', 'carousel', 'exit_left', 'radio', 'shed_door', 'snowdrift', 'snowman', 'tent'],
  L02_shed: ['barrel', 'exit_shed', 'generator'],
  L02_tent: ['exit_tent', 'nika', 'teleporter'],
};
const manifest = parseManifest(JSON.parse(readFileSync(new URL('../../public/data/assets.json', import.meta.url), 'utf8')));
const art = new Map(manifest.entries.filter(entry => entry.levels.includes('L02')).flatMap(entry => [
  [entry.key, entry] as const,
  ...animConfigs(entry).map(animation => [animation.key, entry] as const),
]));

describe('L02 maps', () => {
  for (const [file, ids] of Object.entries(EXPECTED)) {
    test(`${file}: parses, has its hotspots, points and approaches are walkable`, () => {
      const m = parseTiledMap(JSON.parse(readFileSync(new URL(`../../public/assets/maps/${file}.json`, import.meta.url), 'utf8')));
      expect(m.levelId).toBe('L02');
      expect(m.hotspots.map(h => h.id).sort()).toEqual(ids);
      for (const key of [m.background, ...m.sprites.map(s => s.texture)]) {
        const entry = art.get(key);
        expect(entry, key).toBeDefined();
        const png = readFileSync(new URL(`../../public/assets/${entry!.path}`, import.meta.url));
        expect(png.subarray(1, 4).toString()).toBe('PNG');
        if (key === m.background) {
          expect(png.readUInt32BE(16)).toBe(480);
          expect(png.readUInt32BE(20)).toBe(270);
        }
      }
      const nav = new NavGrid(m.walkable, m.blockers);
      expect(nav.isWalkable(m.points.spawn)).toBe(true);
      expect(nav.isWalkable(m.points.spitz_spawn)).toBe(true);
      for (const h of m.hotspots) expect(nav.isWalkable(h.approach), h.id).toBe(true);
      for (const sprite of m.sprites) {
        const turn = m.points[`${sprite.name}_turn`];
        if (!turn) continue;
        const corner = m.points[`${sprite.name}_corner`];
        const route = corner ? [sprite.pos, corner, turn] : [sprite.pos, turn];
        const approach = m.hotspots.find(h => h.id === sprite.name)?.approach;
        for (const [i, a] of route.slice(0, -1).entries()) {
          const b = route[i + 1];
          for (let step = 0; step <= 16; step++) {
            const x = a.x + (b.x - a.x) * step / 16;
            const y = a.y + (b.y - a.y) * step / 16;
            expect(nav.isWalkable({ x, y }), sprite.name).toBe(true);
            if (approach) expect(nav.isWalkable({
              x: x + approach.x - sprite.pos.x, y: y + approach.y - sprite.pos.y,
            }), sprite.name).toBe(true);
          }
        }
      }
    });
  }
});
