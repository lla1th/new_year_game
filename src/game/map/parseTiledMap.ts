import { FLAG_IDS, type CursorKind, type Facing, type FlagId } from '../data/types';
import type { Polygon, Vec2 } from '../nav/geometry';

export interface HotspotDef {
    id: string; shape: Polygon; approach: Vec2; facing: Facing; cursor: CursorKind;
    enabledIf?: FlagId; hiddenIf?: FlagId;
}
export interface SpriteDef { name: string; texture: string; pos: Vec2; depthY: number }
export interface LevelMap {
    levelId: string; background: string; pixelArt: boolean;
    footsteps: 'snow' | 'floor' | 'metal'; music: string;
    walkable: Polygon[]; blockers: Polygon[]; hotspots: HotspotDef[];
    points: Record<string, Vec2>; sprites: SpriteDef[];
}

interface TiledProperty { name: string; type?: string; value: unknown }
interface TiledObject {
    id?: number; name?: string; x: number; y: number;
    width?: number; height?: number; rotation?: number;
    point?: boolean; ellipse?: boolean;
    polygon?: Vec2[]; polyline?: Vec2[];
    properties?: TiledProperty[];
}
interface TiledLayer { name: string; type: string; objects?: TiledObject[] }

const FACINGS: readonly Facing[] = ['dr', 'dl', 'ur', 'ul'];
const CURSORS: readonly CursorKind[] = ['default', 'hand', 'eye', 'gear', 'talk', 'exit'];
const FOOTSTEPS: readonly LevelMap['footsteps'][] = ['snow', 'floor', 'metal'];

function fail(msg: string): never {
    throw new Error(`Tiled map: ${msg}`);
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function propsOf(owner: { properties?: unknown }): Map<string, unknown> {
    const out = new Map<string, unknown>();
    if (!Array.isArray(owner.properties)) return out;
    for (const p of owner.properties) {
        if (isRecord(p) && typeof p.name === 'string') out.set(p.name, p.value);
    }
    return out;
}

function reqString(props: Map<string, unknown>, name: string, where: string): string {
    const v = props.get(name);
    if (typeof v !== 'string' || v === '') fail(`missing string property "${name}" (${where})`);
    return v;
}

function reqNumber(props: Map<string, unknown>, name: string, where: string): number {
    const v = props.get(name);
    if (typeof v !== 'number' || !Number.isFinite(v)) fail(`missing number property "${name}" (${where})`);
    return v;
}

function reqBool(props: Map<string, unknown>, name: string, where: string): boolean {
    const v = props.get(name);
    if (typeof v !== 'boolean') fail(`missing bool property "${name}" (${where})`);
    return v;
}

function reqOneOf<T extends string>(props: Map<string, unknown>, name: string, allowed: readonly T[], where: string): T {
    const v = reqString(props, name, where);
    if (!(allowed as readonly string[]).includes(v)) fail(`property "${name}" = "${v}" is not one of ${allowed.join('/')} (${where})`);
    return v as T;
}

function optFlag(props: Map<string, unknown>, name: string, where: string): FlagId | undefined {
    const v = props.get(name);
    if (v === undefined || v === '') return undefined;
    if (typeof v !== 'string' || !(FLAG_IDS as readonly string[]).includes(v)) fail(`property "${name}" = "${String(v)}" is not a known flag (${where})`);
    return v as FlagId;
}

function describeObject(layer: string, o: TiledObject): string {
    return `layer "${layer}", object ${o.name ? `"${o.name}"` : `#${o.id ?? '?'}`}`;
}

/** Converts a Tiled polygon or rectangle object into an absolute polygon. */
function shapeOf(layer: string, o: TiledObject): Polygon {
    const where = describeObject(layer, o);
    if (o.rotation) fail(`rotated objects are not supported (${where})`);
    if (o.ellipse || o.point || o.polyline) fail(`only polygons and rectangles are allowed (${where})`);
    if (Array.isArray(o.polygon)) {
        if (o.polygon.length < 3) fail(`polygon needs at least 3 points (${where})`);
        return o.polygon.map(p => ({ x: o.x + p.x, y: o.y + p.y }));
    }
    const w = o.width ?? 0;
    const h = o.height ?? 0;
    if (w <= 0 || h <= 0) fail(`rectangle has no size (${where})`);
    return [
        { x: o.x, y: o.y },
        { x: o.x + w, y: o.y },
        { x: o.x + w, y: o.y + h },
        { x: o.x, y: o.y + h },
    ];
}

function findLayer(layers: TiledLayer[], name: string, required: boolean): TiledObject[] {
    const layer = layers.find(l => l.name === name && l.type === 'objectgroup');
    if (!layer) {
        if (required) fail(`missing object layer "${name}"`);
        return [];
    }
    return Array.isArray(layer.objects) ? layer.objects : [];
}

export function parseTiledMap(json: unknown): LevelMap {
    if (!isRecord(json)) fail('not a JSON object');
    const layers = (Array.isArray(json.layers) ? json.layers : []).filter(isRecord) as unknown as TiledLayer[];

    const walkableObjs = findLayer(layers, 'walkable', true);
    const hotspotObjs = findLayer(layers, 'hotspots', true);
    const pointObjs = findLayer(layers, 'points', true);
    const blockerObjs = findLayer(layers, 'blockers', false);
    const spriteObjs = findLayer(layers, 'sprites', false);

    const mp = propsOf(json);
    const levelId = reqString(mp, 'levelId', 'map');
    const background = reqString(mp, 'background', 'map');
    const pixelArt = reqBool(mp, 'pixelArt', 'map');
    const footsteps = reqOneOf(mp, 'footsteps', FOOTSTEPS, 'map');
    const music = reqString(mp, 'music', 'map');

    const walkable = walkableObjs.map(o => shapeOf('walkable', o));
    if (walkable.length === 0) fail('layer "walkable" has no polygons');
    const blockers = blockerObjs.map(o => shapeOf('blockers', o));

    const hotspots: HotspotDef[] = hotspotObjs.map(o => {
        const where = describeObject('hotspots', o);
        if (!o.name) fail(`hotspot without name (${where})`);
        const p = propsOf(o);
        const def: HotspotDef = {
            id: o.name,
            shape: shapeOf('hotspots', o),
            approach: { x: reqNumber(p, 'approachX', where), y: reqNumber(p, 'approachY', where) },
            facing: reqOneOf(p, 'facing', FACINGS, where),
            cursor: reqOneOf(p, 'cursor', CURSORS, where),
        };
        const enabledIf = optFlag(p, 'enabledIf', where);
        const hiddenIf = optFlag(p, 'hiddenIf', where);
        if (enabledIf) def.enabledIf = enabledIf;
        if (hiddenIf) def.hiddenIf = hiddenIf;
        return def;
    });
    const ids = new Set<string>();
    for (const h of hotspots) {
        if (ids.has(h.id)) fail(`duplicate hotspot "${h.id}"`);
        ids.add(h.id);
    }

    const points: Record<string, Vec2> = {};
    for (const o of pointObjs) {
        if (!o.name) fail(`point without name (${describeObject('points', o)})`);
        if (o.name in points) fail(`duplicate point "${o.name}"`);
        points[o.name] = { x: o.x, y: o.y };
    }

    const sprites: SpriteDef[] = spriteObjs.map(o => {
        const where = describeObject('sprites', o);
        if (!o.name) fail(`sprite without name (${where})`);
        const p = propsOf(o);
        return {
            name: o.name,
            texture: reqString(p, 'texture', where),
            pos: { x: o.x, y: o.y },
            depthY: reqNumber(p, 'depthY', where),
        };
    });

    return { levelId, background, pixelArt, footsteps, music, walkable, blockers, hotspots, points, sprites };
}
