import type { FlagId, ItemId, LevelId, MoodId, PartId, PuzzleId, SpeakerId } from '../data/types';

export type Step =
    | { say: SpeakerId; key: string; mood?: MoodId } | { dialog: string }
    | { giveItem: ItemId } | { removeItem: ItemId } | { givePart: PartId } | { removePart: PartId }
    | { setFlag: FlagId } | { anim: string } | { sfx: string }
    | { walkTo: string }                     // point name from the `points` layer
    | { openPuzzle: PuzzleId; onSolved?: Step[] }   // onSolved runs only if the screen was solved
    | { goto: { level: LevelId; screen?: string } }
    | { cutscene: string } | { wait: number } | { checkpoint: true }
    | { openTalk: string }                   // меню разговоров, id из talks.json
    | { chooseName: true }                   // экран выбора имени шпица (L01)
    | { ifFlag: FlagId; then: Step[]; else?: Step[] }
    | { ifItem: ItemId; then: Step[]; else?: Step[] }
    | { ifSpitzName: 1 | 2; then: Step[]; else?: Step[] };   // по выбранному имени шпица

export interface HotspotScript {
    hotspot: string;
    onInspect?: Step[];                       // default: say ksyusha `<lvl>.<hotspot>.inspect` (lvl = 'l01'…)
    onUse?: Step[];                           // default = onInspect
    onItem?: Partial<Record<ItemId, Step[]>>; // no entry → say ksyusha common.wrongItem.* (random)
    when?: FlagId; unless?: FlagId;           // variants of one hotspot by flags; first match wins
}
export interface Goal { flag: FlagId; hintKeys: [string, string, string] }
export interface SideRoomTarget {
    id: string;
    at: number;
    label: string;
    icon: string;
    kind: 'worker' | 'supply' | 'clue';
    when?: FlagId;
    unless?: FlagId;
}
export interface SideRoomSpec {
    title: string;
    action: string;
    objective: string;
    width: number;
    theme: 'cakes' | 'candy' | 'glaze';
    flag: FlagId;
    left?: string;
    puzzle: PuzzleId;
    targets: SideRoomTarget[];
    tasks: [FlagId, string][];
}
export interface ScreenScript { map: string /* path to the Tiled JSON */; hotspots: HotspotScript[]; onEnter?: Step[]; sideRoom?: SideRoomSpec }
export interface LevelScript { levelId: LevelId; screens: Record<string, ScreenScript>; firstScreen: string; goals: Goal[] }
