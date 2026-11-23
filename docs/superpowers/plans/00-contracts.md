# Общие контракты (для всех этапов)

Здесь зафиксированы имена файлов, типы и сигнатуры, на которые опираются все планы M0–M5.
Этап, который **создаёт** контракт, указан в скобках. Менять контракт можно только синхронно во всех местах
использования и с правкой этого файла.

## 1. Базовые типы — `src/game/data/types.ts` (M0)

```ts
export type LevelId = 'L01' | 'L02' | 'L03' | 'L04' | 'L05' | 'L06' | 'L07' | 'L08';
export type WorldStyle = 'w1' | 'w2' | 'w3' | 'fin';
export const LEVEL_STYLE: Record<LevelId, WorldStyle> =
  { L01: 'w1', L02: 'w1', L03: 'w1', L04: 'w2', L05: 'w2', L06: 'w3', L07: 'w3', L08: 'fin' };

export type ItemId =
  | 'ITEM_MANDARIN' | 'ITEM_SAUSAGE'
  | 'ITEM_BULB_BLUE'
  | 'ITEM_GATE_KEY' | 'ITEM_COCOA'
  | 'ITEM_CANDY_CANE' | 'ITEM_VALVE' | 'ITEM_MITTENS'
  | 'ITEM_RIBBON' | 'ITEM_GINGER_MEDAL' | 'ITEM_KEEPER_MEDAL'
  // переработка 23.11 (R0):
  | 'ITEM_BULB_RED' | 'ITEM_BULB_YELLOW' | 'ITEM_FOIL' | 'ITEM_SHED_KEY' | 'ITEM_PUMP' | 'ITEM_PARCEL' | 'ITEM_OILCAN'
  | 'ITEM_DUSTER' | 'ITEM_FEATHER' | 'ITEM_POWDER' | 'ITEM_SNOW' | 'ITEM_PEN' | 'ITEM_LETTER_M' | 'ITEM_PENCIL'
  | 'ITEM_TINSEL_BALL' | 'ITEM_WIND_KEY';

export const ALL_ITEM_IDS: readonly ItemId[] = [
  'ITEM_MANDARIN', 'ITEM_SAUSAGE', 'ITEM_BULB_BLUE',
  'ITEM_GATE_KEY', 'ITEM_COCOA', 'ITEM_CANDY_CANE', 'ITEM_VALVE', 'ITEM_MITTENS',
  'ITEM_RIBBON', 'ITEM_GINGER_MEDAL', 'ITEM_KEEPER_MEDAL',
  'ITEM_BULB_RED', 'ITEM_BULB_YELLOW', 'ITEM_FOIL', 'ITEM_SHED_KEY', 'ITEM_PUMP', 'ITEM_PARCEL', 'ITEM_OILCAN',
  'ITEM_DUSTER', 'ITEM_FEATHER', 'ITEM_POWDER', 'ITEM_SNOW', 'ITEM_PEN', 'ITEM_LETTER_M', 'ITEM_PENCIL',
  'ITEM_TINSEL_BALL', 'ITEM_WIND_KEY',
];

export type PartId = 'PART_SPRING' | 'PART_GEAR' | 'PART_HANDS';

export const FLAG_IDS = [
  'L01_SPITZ_FREED', 'L01_PORTAL_OPEN', 'L01_PORTAL_ENTERED', 'L01_NAME_CHOSEN', 'L01_BRIEFING_DONE', 'L01_TREE_SEEN', 'L01_TERRARIUM_SEEN',
  'L02_SNOWMAN_SAD', 'L02_SNOWMAN_HAPPY', 'L02_CAROUSEL_SPUN', 'L02_BULB_BLUE_TAKEN', 'L02_GATE_OPEN',
  'L02_FOIL_TAKEN', 'L02_BULB_RED_TAKEN', 'L02_CAT_SCENE_DONE', 'L02_SHED_KEY_TAKEN', 'L02_SHED_OPEN', 'L02_PUMP_TAKEN',
  'L02_BULBS_PLACED', 'L02_PUMP_FILLED', 'L02_VENDOR_MET', 'L02_FUELED', 'L02_GENERATOR_ON', 'L02_FAIR_ALIVE', 'L02_GALLERY_WON', 'L02_FINISHED',
  'L03_DOOR_OPEN', 'L03_OWL_AWAKE', 'L03_FRESCO_SEEN', 'L03_BELLS_DONE',
  'L03_PARCEL_TAKEN', 'L03_BELLS_OILED',
  'L04_VALVE_TAKEN', 'L04_VALVE_INSTALLED', 'L04_PIPES_DONE',
  'L04_MARMELADYCH_AWAY', 'L04_TANK_FILLED',
  'L05_ENTERED', 'L05_CRATES_DONE',
  'L05_SEMYON_AGREED', 'L05_SEMYON_PASSED', 'L05_STRANGER_SEEN', 'L05_PEN_HINT',
  'L06_BRIDGE_DONE', 'L06_PENCIL_TAKEN', 'L06_LADDER_DRAWN',
  'L07_DRAWING_FOUND', 'L07_RIBBON_GIVEN', 'L07_MEDAL_GIVEN', 'L07_CAT_RECONCILED', 'L07_GATE_OPEN',
  'L08_PARTS_INSERTED', 'L08_GIFT_OPENED', 'L08_OUTFIT_DONE', 'L08_KEY_TAKEN',
  'GAME_COMPLETED',
] as const;
export type FlagId = typeof FLAG_IDS[number];

export type PuzzleId = 'P-02' | 'P-03' | 'P-04' | 'P-05' | 'P-06' | 'P-08' | 'P-09' | 'S-02b'
  | 'fridge' | 'fresco' | 'drawing' | 'clock';   // приближённые экраны без логики головоломки тоже открываются как «puzzle»

export type SpeakerId = 'ksyusha' | 'spitz' | 'cat' | 'snail' | 'nika' | 'lekha' | 'owl' | 'snowman' | 'ginger'
  | 'sveta' | 'vendor' | 'monkey' | 'timofey' | 'grisha' | 'marmeladych' | 'klava' | 'semyon'
  | 'cactus' | 'crow' | 'bambah' | 'tik' | 'tak' | 'pendulum' | 'mask' | 'stranger';
export type Facing = 'dr' | 'dl' | 'ur' | 'ul';
export type CursorKind = 'default' | 'hand' | 'eye' | 'gear' | 'talk' | 'exit';

export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;
export const INVENTORY_SIZE = 6;
```

## 2. Геометрия и навигация (M0)

`src/game/nav/geometry.ts`
```ts
export interface Vec2 { x: number; y: number }
export type Polygon = Vec2[];
export function pointInPolygon(p: Vec2, poly: Polygon): boolean;   // ray casting, точка на ребре = внутри
export function distance(a: Vec2, b: Vec2): number;
```

`src/game/nav/facing.ts`
```ts
export function facingFromVector(dx: number, dy: number): Facing;
// dx >= 0 && dy >= 0 → 'dr'; dx >= 0 && dy < 0 → 'ur'; dx < 0 && dy >= 0 → 'dl'; dx < 0 && dy < 0 → 'ul'
```

`src/game/nav/NavGrid.ts`
```ts
export class NavGrid {
  constructor(walkable: Polygon[], blockers: Polygon[], cellSize?: number /*16*/, width?: number /*1920*/, height?: number /*1080*/);
  isWalkable(p: Vec2): boolean;
  nearestWalkable(p: Vec2): Vec2 | null;        // центр ближайшей проходимой клетки
  findPath(from: Vec2, to: Vec2): Vec2[];       // без стартовой точки, последняя = цель (или nearestWalkable(цель)); [] если пути нет
}
```

## 3. Разметка Tiled — `src/game/map/parseTiledMap.ts` (M0)

```ts
export interface HotspotDef {
  id: string; shape: Polygon; approach: Vec2; facing: Facing; cursor: CursorKind;
  enabledIf?: FlagId; hiddenIf?: FlagId;
}
export interface SpriteDef { name: string; texture: string; pos: Vec2; depthY: number }
export interface LevelMap {
  levelId: string; background: string; pixelArt: boolean;
  footsteps: 'snow' | 'floor' | 'metal'; music: string;
  walkable: Polygon[]; blockers: Polygon[]; hotspots: HotspotDef[];
  points: Record<string, Vec2>; sprites: SpriteDef[];
}
export function parseTiledMap(json: unknown): LevelMap;   // бросает Error с понятным текстом, если нет слоя/свойства
```

## 4. Состояние и сохранения (M1)

`src/state/GameStateModel.ts`
```ts
export interface SaveData {
  version: 2; levelId: LevelId; screenId: string | null;
  flags: Partial<Record<FlagId, boolean>>; inventory: ItemId[]; parts: PartId[];
  completed: boolean; savedAt: string;
  spitzName: 1 | 2 | null; talksSeen: string[];   // R0: имя шпица (вариант) и просмотренные разговоры
}
export class GameStateModel {
  levelId: LevelId; screenId: string | null;
  flags: Partial<Record<FlagId, boolean>>; inventory: ItemId[]; parts: PartId[]; completed: boolean;
  spitzName: 1 | 2 | null; talksSeen: string[];
  markTalkSeen(id: string): void;  hasSeenTalk(id: string): boolean;   // без дублей
  hasFlag(f: FlagId): boolean;  setFlag(f: FlagId): void;
  hasItem(i: ItemId): boolean;  addItem(i: ItemId): boolean;  removeItem(i: ItemId): void;  // addItem: false если полон или уже есть
  addPart(p: PartId): void;     removePart(p: PartId): void;
  toSaveData(now?: Date): SaveData;  loadFrom(d: SaveData): void;  reset(): void;   // reset → L01, всё пусто (и spitzName, talksSeen)
}
```
`src/state/gameState.ts` — `export const gameState = reactive(new GameStateModel())` (Vue `reactive`).

`src/state/SaveService.ts`
```ts
export const SAVE_KEY = 'onye-save-v1';
export const SETTINGS_KEY = 'onye-settings-v1';
export interface Settings { musicVolume: number; sfxVolume: number; textSpeed: 'slow' | 'normal' | 'fast'; fullscreen: boolean }
export const DEFAULT_SETTINGS: Settings = { musicVolume: 70, sfxVolume: 80, textSpeed: 'normal', fullscreen: false };
export function saveGame(d: SaveData, storage?: Storage): void;
export function loadGame(storage?: Storage): SaveData | null;     // null: нет, повреждено, version !== 2 (сохранения v1 отбрасываются: уровни переделаны)
export function clearSave(storage?: Storage): void;
export function loadSettings(storage?: Storage): Settings;        // недостающие поля — из DEFAULT_SETTINGS
export function saveSettings(s: Settings, storage?: Storage): void;
```

## 5. События — `src/events.ts` (M1)

```ts
export type GameEvents = {
  'say': { speaker: SpeakerId; textKey: string };
  'say:done': void;
  'dialog:start': { dialogId: string };
  'dialog:end': { dialogId: string };
  'item:drop': { itemId: ItemId; x: number; y: number };     // координаты игры 1920×1080
  'item:combine': { a: ItemId; b: ItemId };
  'hint:request': void;
  'highlight:all': void;
  'cursor': { kind: CursorKind };
  'scene:ready': { levelId: LevelId; screenId: string | null };
  'puzzle:open': { puzzleId: PuzzleId };
  'puzzle:close': { puzzleId: PuzzleId; solved: boolean };
  'checkpoint': void;
  'ending:card': void;           // M3: показать открытку
  'ending:credits': void;        // M3
  'ending:post': void;           // M3: титры закончились → сцена после титров (Vue → Phaser)
  'ending:done': void;           // M3: сцена после титров закончилась → главное меню (Phaser → Vue)
  'loading': { progress: number | null };   // M5: загрузка уровня 0..1, null — готово (экран загрузки)
  'part:drop': { partId: PartId; x: number; y: number };   // M3: деталь из индикатора Часов брошена на сцену (L08)
};
export class TypedEmitter<E extends Record<string, unknown>> {
  on<K extends keyof E>(k: K, fn: (p: E[K]) => void): () => void;   // возвращает отписку
  off<K extends keyof E>(k: K, fn: (p: E[K]) => void): void;
  emit<K extends keyof E>(k: K, ...p: E[K] extends void ? [] : [E[K]]): void;
}
export const bus: TypedEmitter<GameEvents>;
```

## 6. Тексты и данные (M1)

Файлы: `public/data/texts/ru.json` (`Record<string,string>`), `public/data/characters.json`,
`public/data/items.json`, `public/data/dialogs.json`.

```ts
// src/game/data/TextBank.ts
export class TextBank {
  constructor(dict: Record<string, string>, names: Record<string, string>);
  t(key: string): string;            // подставляет {name.spitz} и т.п. (алиас {spitz}); нет ключа → `⟨key⟩` + console.warn
  setName(id: string, value: string): void;   // R0: сменить имя (шпиц после выбора); до выбора — «Шпиц»
  randomVariant(prefix: string, rng?: () => number, avoid?: string): { key: string; text: string };
  // ключи prefix.1 … prefix.N; не возвращает avoid, если N > 1
}
// src/game/data/schemas.ts
export interface CharactersFile { names: Record<SpeakerId, string>; portraits: Partial<Record<SpeakerId, Partial<Record<WorldStyle, string>>>> }
export interface ItemDef { icon: string; nameKey: string; inspectKey: string; style: WorldStyle }
export type ItemsFile = Record<ItemId, ItemDef>;
export interface DialogChoice { key: string; reply?: { speaker: SpeakerId; key: string } }
export interface DialogLine { speaker: SpeakerId; key: string; choices?: DialogChoice[] }
export type DialogsFile = Record<string, DialogLine[]>;
```

## 7. Скрипты уровней (M1)

```ts
// src/game/script/types.ts
export type Step =
  | { say: SpeakerId; key: string } | { dialog: string }
  | { giveItem: ItemId } | { removeItem: ItemId } | { givePart: PartId } | { removePart: PartId }  // M3: removePart
  | { setFlag: FlagId } | { anim: string } | { sfx: string }
  | { walkTo: string }                     // имя точки из слоя points
  | { openPuzzle: PuzzleId; onSolved?: Step[] }   // M2: onSolved — только если экран решён
  | { goto: { level: LevelId; screen?: string } }
  | { cutscene: string } | { wait: number } | { checkpoint: true }
  | { ifFlag: FlagId; then: Step[]; else?: Step[] }  // M2: условные шаги
  | { ifItem: ItemId; then: Step[]; else?: Step[] };
export interface HotspotScript {
  hotspot: string;
  onInspect?: Step[];                       // по умолчанию: say ksyusha `<lvl>.<hotspot>.inspect` (lvl = 'l01'…)
  onUse?: Step[];                           // по умолчанию = onInspect
  onItem?: Partial<Record<ItemId, Step[]>>; // нет записи → say ksyusha common.wrongItem.* (случайно)
  when?: FlagId; unless?: FlagId;           // для вариантов одного хотспота по флагам; берётся первый подходящий
}
export interface Goal { flag: FlagId; hintKeys: [string, string, string] }
export interface ScreenScript { map: string /* путь к JSON Tiled */; hotspots: HotspotScript[]; onEnter?: Step[] }
export interface LevelScript { levelId: LevelId; screens: Record<string, ScreenScript>; firstScreen: string; goals: Goal[] }

// src/game/script/ScriptRunner.ts
export interface ScriptContext {
  state: GameStateModel;
  say(speaker: SpeakerId, key: string): Promise<void>;
  dialog(id: string): Promise<void>;
  anim(name: string): Promise<void>;
  sfx(name: string): void;
  walkTo(point: string): Promise<void>;
  openPuzzle(id: PuzzleId): Promise<boolean>;      // true = решена
  goto(level: LevelId, screen?: string): Promise<void>;
  cutscene(name: string): Promise<void>;
  wait(ms: number): Promise<void>;
  checkpoint(): void;
  progress(): void;                                // сообщить HintSystem о прогрессе
}
export class ScriptRunner {
  constructor(ctx: ScriptContext);
  run(steps: Step[], alive?: () => boolean): Promise<void>; // шаги последовательно; setFlag/giveItem/removeItem/givePart вызывают ctx.progress();
                                                   // alive() проверяется перед каждым шагом — false (сцена остановлена, уровень сменился) обрывает скрипт
  pickScript(list: HotspotScript[], hotspot: string): HotspotScript | undefined;  // учитывает when/unless
}
```

## 8. Подсказки — `src/game/systems/HintSystem.ts` (M1)

```ts
export const AUTO_HINT_MS = 90_000;
export class HintSystem {
  constructor(goals: Goal[], hasFlag: (f: FlagId) => boolean, now: () => number);
  currentGoal(): Goal | null;          // первая цель с неустановленным флагом
  nextHint(): string | null;           // ключ ступени 1 → 2 → 3 → 3…; общий счётчик с автоподсказкой
  notifyProgress(): void;              // сброс таймера; если цель сменилась — счётчик ступеней в 0
  tick(): string | null;               // ключ, если с последнего прогресса/подсказки прошло ≥ AUTO_HINT_MS; таймер сбрасывается
}
```

## 9. Логика головоломок — `src/puzzles/logic/*.ts` (M2, M3)

Чистые функции без Phaser и Vue, неизменяемые состояния (каждая операция возвращает новое состояние).
Сигнатуры заданы в планах M2 (P-02…P-05) и M3 (P-06…P-08, комбинирование).

## 10. Заглушки ассетов (M0)

`src/game/assets/placeholder.ts`: `ensureTexture(scene, key, w, h, label): string` — если текстуры `key` нет
в кэше, создаёт цветной прямоугольник с подписью `label` и возвращает `key`. Все сцены берут текстуры только через
неё, чтобы игра работала без готовой графики.

## 11. Сцены (M0, M1)

```ts
// src/game/scenes/LevelScene.ts
walkTo(target: Vec2): Promise<void>;                          // M0; отклоняется при прерывании новым кликом
loadLevel(script: LevelScript, screen?: string): Promise<void>; // M1; ставит контрольную точку
// src/game/scenes/OverlayScene.ts (M1) — базовый класс экранов головоломок и приближений
export abstract class OverlayScreen {
  abstract create(container: Phaser.GameObjects.Container): void;
  solve(): void;   // закрывает экран, openPuzzle → true
  close(): void;   // закрывает экран, openPuzzle → false; состояние головоломки сохраняется до конца уровня
}
// регистрация: registerScreen(id: PuzzleId, factory: () => OverlayScreen)
```
