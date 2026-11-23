import type { PartId } from '../../game/data/types';

/** L08: a Clock part fits only its own silhouette (TASK-014). */
export function fitsSlot(part: PartId, slot: PartId): boolean {
    return part === slot;
}

export const CLOCK_SLOTS: readonly PartId[] = ['PART_SPRING', 'PART_GEAR', 'PART_HANDS'];
