import type { FlagId, ItemId, LevelId, SpeakerId, WorldStyle } from './types';

export interface CharactersFile { names: Record<SpeakerId, string>; portraits: Partial<Record<SpeakerId, Partial<Record<WorldStyle, string>>>> }
export interface ItemDef { icon: string; nameKey: string; inspectKey: string; style: WorldStyle }
export type ItemsFile = Record<ItemId, ItemDef>;
export interface DialogChoice { key: string; reply?: { speaker: SpeakerId; key: string }; correct?: boolean }
export interface DialogLine { speaker: SpeakerId; key: string; choices?: DialogChoice[]; retry?: boolean }
export type DialogsFile = Record<string, DialogLine[]>;

/** Тема меню разговоров (SCRIPT §12а). */
export interface TalkTopic {
    id: string;                 // 'clock' → ключ просмотра `${talkId}.${id}`
    menuKey: string;            // `talk.<talk>.<id>.menu`
    dialog?: string;            // id в dialogs.json (нет у темы-подсказки)
    hint?: true;                // тема «Что делать дальше»: выдаёт ступень подсказки
    once?: true;
    when?: FlagId; unless?: FlagId;
    fromLevel?: LevelId; toLevel?: LevelId;   // включительно, по порядку L01…L08
}
export interface TalkDef { speaker: SpeakerId; topics: TalkTopic[] }
export type TalksFile = Record<string, TalkDef>;

/** public/data/gallery.json — тир S-02b (поля автора). */
export interface GalleryFile {
    rules: { shots: number; points: { red: number; gold: number; black: number }; fallbackTop: number };
    board: { name: string | null; points: number | null }[];
}
