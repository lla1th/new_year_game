import type { HotspotDef, SpriteDef } from '../src/game/map/parseTiledMap';
import type { Polygon, Vec2 } from '../src/game/nav/geometry';
import { NavGrid } from '../src/game/nav/NavGrid';

export type { Polygon, Vec2, HotspotDef, SpriteDef };

export interface MapSpec {
  levelId: string; background: string; pixelArt: boolean;
  footsteps: 'snow' | 'floor' | 'metal'; music: string;
  walkable: Polygon[]; blockers?: Polygon[];
  hotspots: HotspotDef[];
  points: Record<string, Vec2>;
  sprites?: SpriteDef[];
}

export const rect = (x: number, y: number, w: number, h: number): Polygon => [
  { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h },
];

type Prop = { name: string; type: string; value: unknown };
const prop = (name: string, value: unknown): Prop => ({
  name, value,
  type: typeof value === 'number' ? 'int' : typeof value === 'boolean' ? 'bool' : 'string',
});

let nextId = 1;
function polyObject(name: string, poly: Polygon, properties?: Prop[]) {
  const o = poly[0];
  return {
    id: nextId++, name, type: '', rotation: 0, visible: true,
    x: o.x, y: o.y, width: 0, height: 0,
    polygon: poly.map(p => ({ x: p.x - o.x, y: p.y - o.y })),
    ...(properties ? { properties } : {}),
  };
}
function pointObject(name: string, p: Vec2, properties?: Prop[]) {
  return {
    id: nextId++, name, type: '', rotation: 0, visible: true, point: true,
    x: p.x, y: p.y, width: 0, height: 0,
    ...(properties ? { properties } : {}),
  };
}
const layer = (id: number, name: string, objects: unknown[]) => ({
  id, name, type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects,
});

/** Строит готовый Tiled JSON, который читает `parseTiledMap`. */
export function buildTiledMap(spec: MapSpec): Record<string, unknown> {
  const blockers = spec.blockers ?? [];
  const nav = new NavGrid(spec.walkable, blockers);
  for (const [name, p] of Object.entries(spec.points)) {
    if ((name.startsWith('spawn') || name.startsWith('spitz')) && !nav.isWalkable(p)) {
      throw new Error(`Map ${spec.levelId}: point "${name}" (${p.x}, ${p.y}) is outside the walkable area`);
    }
  }
  nextId = 1;
  const hotspots = spec.hotspots.map(h => polyObject(h.id, h.shape, [
    prop('approachX', h.approach.x), prop('approachY', h.approach.y),
    prop('cursor', h.cursor), prop('facing', h.facing),
    ...(h.enabledIf ? [prop('enabledIf', h.enabledIf)] : []),
    ...(h.hiddenIf ? [prop('hiddenIf', h.hiddenIf)] : []),
  ]));
  return {
    compressionlevel: -1, height: 135, width: 240, tilewidth: 8, tileheight: 8,
    infinite: false, orientation: 'orthogonal', renderorder: 'right-down', type: 'map',
    version: '1.10', tiledversion: '1.11.2', tilesets: [],
    properties: [
      prop('background', spec.background), prop('footsteps', spec.footsteps),
      prop('levelId', spec.levelId), prop('music', spec.music), prop('pixelArt', spec.pixelArt),
    ],
    layers: [
      layer(1, 'walkable', spec.walkable.map(p => polyObject('', p))),
      layer(2, 'blockers', blockers.map(p => polyObject('', p))),
      layer(3, 'hotspots', hotspots),
      layer(4, 'points', Object.entries(spec.points).map(([n, p]) => pointObject(n, p))),
      layer(5, 'sprites', (spec.sprites ?? []).map(s =>
        pointObject(s.name, s.pos, [prop('depthY', s.depthY), prop('texture', s.texture)]))),
    ],
    nextlayerid: 6, nextobjectid: nextId,
  };
}
