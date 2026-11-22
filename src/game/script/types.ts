import type { FlagId, ItemId, LevelId, PartId, PuzzleId, SpeakerId } from '../data/types';

export type Step =
    | { say: SpeakerId; key: string } | { dialog: string }
    | { giveItem: ItemId } | { removeItem: ItemId } | { givePart: PartId }
    | { setFlag: FlagId } | { anim: string } | { sfx: string }
    | { walkTo: string }                     // point name from the `points` layer
    | { openPuzzle: PuzzleId; onSolved?: Step[] }   // onSolved runs only if the screen was solved
    | { goto: { level: LevelId; screen?: string } }
    | { cutscene: string } | { wait: number } | { checkpoint: true }
    | { ifFlag: FlagId; then: Step[]; else?: Step[] }
    | { ifItem: ItemId; then: Step[]; else?: Step[] };

export interface HotspotScript {
    hotspot: string;
    onInspect?: Step[];                       // default: say ksyusha `<lvl>.<hotspot>.inspect` (lvl = 'l01'…)
    onUse?: Step[];                           // default = onInspect
    onItem?: Partial<Record<ItemId, Step[]>>; // no entry → say ksyusha common.wrongItem.* (random)
    when?: FlagId; unless?: FlagId;           // variants of one hotspot by flags; first match wins
}
export interface Goal { flag: FlagId; hintKeys: [string, string, string] }
export interface ScreenScript { map: string /* path to the Tiled JSON */; hotspots: HotspotScript[]; onEnter?: Step[] }
export interface LevelScript { levelId: LevelId; screens: Record<string, ScreenScript>; firstScreen: string; goals: Goal[] }
