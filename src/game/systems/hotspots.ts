import type { FlagId } from '../data/types';
import type { HotspotDef } from '../map/parseTiledMap';
import { pointInPolygon, type Vec2 } from '../nav/geometry';

/** True if the hotspot is shown and clickable for the current flags. */
export function isHotspotActive(h: HotspotDef, hasFlag: (f: FlagId) => boolean): boolean {
    if (h.hiddenIf && hasFlag(h.hiddenIf)) return false;
    if (h.enabledIf && !hasFlag(h.enabledIf)) return false;
    return true;
}

/** Hotspot under point `p`; on overlap the last one in the list wins. Honours enabledIf / hiddenIf. */
export function hitTestHotspots(list: HotspotDef[], p: Vec2, hasFlag: (f: FlagId) => boolean): HotspotDef | null {
    for (let i = list.length - 1; i >= 0; i--) {
        const h = list[i];
        if (isHotspotActive(h, hasFlag) && pointInPolygon(p, h.shape)) return h;
    }
    return null;
}
