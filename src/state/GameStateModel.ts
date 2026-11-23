import { INVENTORY_SIZE, type FlagId, type ItemId, type LevelId, type PartId } from '../game/data/types';

export interface SaveData {
    version: 2; levelId: LevelId; screenId: string | null;
    flags: Partial<Record<FlagId, boolean>>; inventory: ItemId[]; parts: PartId[];
    completed: boolean; savedAt: string;
    spitzName: 1 | 2 | null; talksSeen: string[];
}

/**
 * The single source of truth for game progress. Plain class (no private #fields) so that
 * Vue's reactive() proxy can wrap it.
 */
export class GameStateModel {
    levelId: LevelId = 'L01';
    screenId: string | null = null;
    flags: Partial<Record<FlagId, boolean>> = {};
    inventory: ItemId[] = [];
    parts: PartId[] = [];
    completed = false;
    /** Выбранное имя шпица (вариант 1 или 2); null — ещё не выбрано. */
    spitzName: 1 | 2 | null = null;
    /** Ключи просмотренных разговоров. */
    talksSeen: string[] = [];

    hasFlag(f: FlagId): boolean { return this.flags[f] === true; }
    setFlag(f: FlagId): void {
        this.flags[f] = true;
        if (f === 'GAME_COMPLETED') this.completed = true;   // the level select opens after the game is completed
    }

    hasItem(i: ItemId): boolean { return this.inventory.includes(i); }

    /** false if the inventory is full or the item is already there. */
    addItem(i: ItemId): boolean {
        if (this.inventory.includes(i) || this.inventory.length >= INVENTORY_SIZE) return false;
        this.inventory.push(i);
        return true;
    }

    removeItem(i: ItemId): void {
        const idx = this.inventory.indexOf(i);
        if (idx >= 0) this.inventory.splice(idx, 1);
    }

    markTalkSeen(id: string): void { if (!this.talksSeen.includes(id)) this.talksSeen.push(id); }
    hasSeenTalk(id: string): boolean { return this.talksSeen.includes(id); }

    addPart(p: PartId): void { if (!this.parts.includes(p)) this.parts.push(p); }

    removePart(p: PartId): void {
        const idx = this.parts.indexOf(p);
        if (idx >= 0) this.parts.splice(idx, 1);
    }

    toSaveData(now: Date = new Date()): SaveData {
        return {
            version: 2,
            levelId: this.levelId,
            screenId: this.screenId,
            flags: { ...this.flags },
            inventory: [...this.inventory],
            parts: [...this.parts],
            completed: this.completed,
            savedAt: now.toISOString(),
            spitzName: this.spitzName,
            talksSeen: [...this.talksSeen],
        };
    }

    loadFrom(d: SaveData): void {
        this.levelId = d.levelId;
        this.screenId = d.screenId;
        this.flags = { ...d.flags };
        this.inventory = [...d.inventory];
        this.parts = [...d.parts];
        this.completed = d.completed;
        this.spitzName = d.spitzName;
        this.talksSeen = [...d.talksSeen];
    }

    /** Back to the very beginning: L01, nothing collected. */
    reset(): void {
        this.levelId = 'L01';
        this.screenId = null;
        this.flags = {};
        this.inventory = [];
        this.parts = [];
        this.completed = false;
        this.spitzName = null;
        this.talksSeen = [];
    }
}
