import type { FlagId, ItemId, LevelId, PartId } from './data/types';
import { gameState } from '../state/gameState';
import { refreshLevel, startLevel } from './controller';

/** Debug mode is on when the page URL has `?debug=1`. */
export function isDebug(search: string = typeof location !== 'undefined' ? location.search : ''): boolean {
    return new URLSearchParams(search).get('debug') === '1';
}

/** Debug panel actions (spec §12: jump to any level, give items and flags). */
export function debugGotoLevel(level: LevelId): void {
    startLevel(level);
}

export function debugGiveItem(item: ItemId): void {
    gameState.addItem(item);
    refreshLevel();
}

export function debugSetFlag(flag: FlagId): void {
    gameState.setFlag(flag);
    refreshLevel();
}

export function debugGivePart(part: PartId): void {
    gameState.addPart(part);
    refreshLevel();
}
