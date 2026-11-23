import type { ItemId, LevelId } from '../data/types';
import type { GameStateModel } from '../../state/GameStateModel';
import type { HotspotScript, Step } from './types';

/** Inspect steps: the script's onInspect or `say ksyusha <lvl>.<hotspot>.inspect`. */
export function inspectSteps(levelId: LevelId, hotspotId: string, s: HotspotScript | undefined): Step[] {
    return s?.onInspect ?? [{ say: 'ksyusha', key: `${levelId.toLowerCase()}.${hotspotId}.inspect` }];
}

/**
 * Use steps: onUse, or inspect when there is none.
 * An item source works once: if onUse gives an item that is already in the inventory, only the inspect text remains.
 */
export function useSteps(levelId: LevelId, hotspotId: string, s: HotspotScript | undefined, state: GameStateModel): Step[] {
    const steps = s?.onUse;
    if (!steps) return inspectSteps(levelId, hotspotId, s);
    const given = steps.find((st): st is { giveItem: ItemId } => 'giveItem' in st);
    if (given && state.hasItem(given.giveItem)) return inspectSteps(levelId, hotspotId, s);
    return steps;
}

/** Item-on-hotspot steps: the script's reaction or a random `common.wrongItem.*` line (key from `pickWrongKey`). */
export function itemSteps(s: HotspotScript | undefined, itemId: ItemId, pickWrongKey: () => string): Step[] {
    return s?.onItem?.[itemId] ?? [{ say: 'ksyusha', key: pickWrongKey() }];
}

/** True if using the hotspot takes Ksyusha to another level/screen (exit cursor). Puzzle rewards do not count. */
export function leadsAway(steps: Step[]): boolean {
    return steps.some(st => 'goto' in st
        || ('ifFlag' in st && (leadsAway(st.then) || leadsAway(st.else ?? [])))
        || ('ifItem' in st && (leadsAway(st.then) || leadsAway(st.else ?? [])))
        || ('ifSpitzName' in st && (leadsAway(st.then) || leadsAway(st.else ?? []))));
}
