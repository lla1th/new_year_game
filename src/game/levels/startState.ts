import type { FlagId, ItemId, LevelId, PartId } from '../data/types';
import type { SaveData } from '../../state/GameStateModel';

type StartState = Pick<SaveData, 'inventory' | 'parts' | 'flags'>;

/** Items a level needs on entry and the parts of the levels before it (level select after the game is completed). */
const TABLE: Record<LevelId, { inventory: ItemId[]; parts: PartId[] }> = {
    L01: { inventory: [], parts: [] },
    L02: { inventory: [], parts: [] },
    L03: { inventory: ['ITEM_COCOA'], parts: [] },
    L04: { inventory: [], parts: ['PART_SPRING'] },
    L05: { inventory: ['ITEM_MITTENS'], parts: ['PART_SPRING'] },
    L06: { inventory: [], parts: ['PART_SPRING', 'PART_GEAR'] },
    L07: { inventory: ['ITEM_PENCIL'], parts: ['PART_SPRING', 'PART_GEAR'] },
    L08: { inventory: [], parts: ['PART_SPRING', 'PART_GEAR', 'PART_HANDS'] },
};

export function startStateFor(level: LevelId): StartState {
    const t = TABLE[level];
    // From L02 on the spitz is the partner (hint button), the name is chosen and the briefing is done;
    // from L03 on the fair (L02) is finished.
    const flags: Partial<Record<FlagId, boolean>> = {};
    if (level !== 'L01') Object.assign(flags, { L01_SPITZ_FREED: true, L01_BRIEFING_DONE: true, L01_NAME_CHOSEN: true });
    if (level !== 'L01' && level !== 'L02') flags.L02_FINISHED = true;
    return { inventory: [...t.inventory], parts: [...t.parts], flags };
}
