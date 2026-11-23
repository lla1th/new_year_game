import type { GameData } from './loadData';

let current: GameData | null = null;

/** Set once by the Vue app after loadData(). */
export function setGameData(d: GameData): void {
    current = d;
}

export function getGameData(): GameData | null {
    return current;
}
