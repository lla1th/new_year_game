import type { CursorKind, ItemId, LevelId, MoodId, PartId, PuzzleId, SpeakerId } from './game/data/types';

export type GameEvents = {
    'say': { speaker: SpeakerId; textKey: string; mood?: MoodId };
    'say:done': void;
    'dialog:start': { dialogId: string };
    'dialog:end': { dialogId: string };
    'item:drop': { itemId: ItemId; x: number; y: number };     // game coordinates 1920×1080
    'item:combine': { a: ItemId; b: ItemId };
    'hint:request': void;
    'highlight:all': void;
    'cursor': { kind: CursorKind };
    'scene:ready': { levelId: LevelId; screenId: string | null };
    'l01:intro': { active: boolean };
    'puzzle:open': { puzzleId: PuzzleId };
    'puzzle:close': { puzzleId: PuzzleId; solved: boolean };
    'checkpoint': void;
    'ending:card': void;           // M3
    'ending:credits': void;        // M3
    'ending:post': void;           // credits finished → post-credits scene (Vue → Phaser)
    'ending:done': void;           // post-credits scene finished → main menu (Phaser → Vue)
    'loading': { progress: number | null };   // level loading 0..1; null = done (loading screen)
    'name:open': void;                        // показать выбор имени шпица (Phaser → Vue)
    'name:pick': { option: 1 | 2 | 3 };       // игрок нажал кнопку имени (Vue → Phaser)
    'name:done': { option: 1 | 2 };           // имя выбрано, экран закрыть
    'talk:open': { talkId: string };          // показать меню разговоров (Phaser → Vue)
    'talk:close': void;                       // меню закрыто («Ладно, пока»)
    'part:drop': { partId: PartId; x: number; y: number };   // a Clock part dropped from the indicator (game coordinates)
};

type Listener<P> = (p: P) => void;

export class TypedEmitter<E extends Record<string, unknown>> {
    private listeners: { [K in keyof E]?: Listener<E[K]>[] } = {};

    /** Returns an unsubscribe function. */
    on<K extends keyof E>(k: K, fn: (p: E[K]) => void): () => void {
        (this.listeners[k] ??= []).push(fn);
        return () => this.off(k, fn);
    }

    off<K extends keyof E>(k: K, fn: (p: E[K]) => void): void {
        const list = this.listeners[k];
        if (!list) return;
        const i = list.indexOf(fn);
        if (i >= 0) list.splice(i, 1);
    }

    emit<K extends keyof E>(k: K, ...p: E[K] extends void ? [] : [E[K]]): void {
        const list = this.listeners[k];
        if (!list) return;
        for (const fn of [...list]) fn(p[0] as E[K]);
    }
}

export const bus = new TypedEmitter<GameEvents>();
