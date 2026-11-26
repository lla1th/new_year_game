import { rect, type HotspotDef, type MapSpec, type SpriteDef, type Vec2 } from './mapSpec.ts';

/** Общие настройки экранов L02 (мир 1, пиксель). */
export const FLOOR = rect(80, 540, 1760, 460);

export const spot = (
  id: string, x: number, y: number, w: number, h: number, approach: Vec2,
  cursor: HotspotDef['cursor'] = 'eye', extra: Partial<HotspotDef> = {},
): HotspotDef => ({ id, shape: rect(x, y, w, h), approach, facing: 'ur', cursor, ...extra });

export const sprite = (name: string, x: number, y: number, depthY = y + 1): SpriteDef => ({ name, texture: `l02_${name}`, pos: { x, y }, depthY });

export function l02Map(background: string, hotspots: HotspotDef[], sprites: SpriteDef[], points: Record<string, Vec2> = {}): MapSpec {
  return {
    levelId: 'L02', background, pixelArt: true, footsteps: 'snow', music: 'mus_world1',
    walkable: [FLOOR], hotspots, sprites,
    points: { spawn: { x: 300, y: 850 }, spitz_spawn: { x: 220, y: 900 }, ...points },
  };
}
