import { test, expect } from 'vitest';
import { buildTiledMap, rect, type MapSpec } from '../../tools/mapSpec';
import { parseTiledMap } from '../../src/game/map/parseTiledMap';
import { NavGrid } from '../../src/game/nav/NavGrid';

const spec: MapSpec = {
  levelId: 'L02', background: 'w1_gate_bg', pixelArt: true, footsteps: 'snow', music: 'mus_world1',
  walkable: [rect(100, 600, 1700, 300)],
  hotspots: [{ id: 'gate', shape: rect(1500, 400, 200, 300), approach: { x: 1450, y: 700 }, facing: 'dr', cursor: 'hand' }],
  points: { spawn: { x: 300, y: 750 }, spitz: { x: 200, y: 760 } },
};

test('generated map round-trips through parseTiledMap', () => {
  const m = parseTiledMap(buildTiledMap(spec));
  expect(m.levelId).toBe('L02');
  expect(m.hotspots.map(h => h.id)).toEqual(['gate']);
  expect(m.hotspots[0].shape).toEqual(rect(1500, 400, 200, 300));
  expect(m.points.spawn).toEqual({ x: 300, y: 750 });
  expect(new NavGrid(m.walkable, m.blockers).isWalkable(m.points.spawn)).toBe(true);
});
test('a spawn point outside the walkable area is rejected', () => {
  expect(() => buildTiledMap({ ...spec, points: { spawn: { x: 5, y: 5 } } })).toThrow(/spawn/);
});
test('blockers, sprites and hotspot flags are preserved', () => {
  const m = parseTiledMap(buildTiledMap({
    ...spec,
    blockers: [rect(800, 650, 100, 100)],
    sprites: [{ name: 'lamp', texture: 'lamp', pos: { x: 1200, y: 640 }, depthY: 650 }],
    hotspots: [{ ...spec.hotspots[0], enabledIf: 'L02_GATE_OPEN', hiddenIf: 'L02_FINISHED' }],
  }));
  expect(m.blockers).toHaveLength(1);
  expect(m.sprites[0]).toEqual({ name: 'lamp', texture: 'lamp', pos: { x: 1200, y: 640 }, depthY: 650 });
  expect(m.hotspots[0].enabledIf).toBe('L02_GATE_OPEN');
  expect(m.hotspots[0].hiddenIf).toBe('L02_FINISHED');
});
