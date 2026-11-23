import type { ItemId, SpeakerId, WorldStyle } from './types';

export interface CharactersFile { names: Record<SpeakerId, string>; portraits: Partial<Record<SpeakerId, Partial<Record<WorldStyle, string>>>> }
export interface ItemDef { icon: string; nameKey: string; inspectKey: string; style: WorldStyle }
export type ItemsFile = Record<ItemId, ItemDef>;
export interface DialogChoice { key: string; reply?: { speaker: SpeakerId; key: string }; correct?: boolean }
export interface DialogLine { speaker: SpeakerId; key: string; choices?: DialogChoice[]; retry?: boolean }
export type DialogsFile = Record<string, DialogLine[]>;
