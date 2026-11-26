export type LevelId = 'L01' | 'L02' | 'L03' | 'L04' | 'L05' | 'L06' | 'L07' | 'L08';
export const LEVEL_ORDER: readonly LevelId[] = ['L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08'];
export type WorldStyle = 'w1' | 'w2' | 'w3' | 'fin';
export const LEVEL_STYLE: Record<LevelId, WorldStyle> =
  { L01: 'w1', L02: 'w1', L03: 'w1', L04: 'w2', L05: 'w2', L06: 'w3', L07: 'w3', L08: 'fin' };

export type ItemId =
  | 'ITEM_MANDARIN' | 'ITEM_SAUSAGE'
  | 'ITEM_BULB_BLUE'
  | 'ITEM_GATE_KEY' | 'ITEM_COCOA'
  | 'ITEM_CANDY_CANE' | 'ITEM_VALVE' | 'ITEM_MITTENS'
  | 'ITEM_RIBBON' | 'ITEM_GINGER_MEDAL' | 'ITEM_KEEPER_MEDAL'
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
  'L04_CAKES_DONE', 'L04_SORT_DONE', 'L04_VALVE_TAKEN', 'L04_VALVE_INSTALLED', 'L04_PIPES_DONE',
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
  | 'l04-cakes' | 'l04-candy' | 'fridge' | 'fresco' | 'drawing' | 'clock';   // приближённые экраны без логики головоломки тоже открываются как «puzzle»

export type SpeakerId = 'ksyusha' | 'spitz' | 'cat' | 'snail' | 'nika' | 'lekha' | 'owl' | 'snowman' | 'ginger'
  | 'sveta' | 'vendor' | 'monkey' | 'timofey' | 'grisha' | 'marmeladych' | 'klava' | 'semyon'
  | 'cactus' | 'crow' | 'bambah' | 'tik' | 'tak' | 'pendulum' | 'mask' | 'stranger';
/** Реакция говорящего: определяет, какой портрет показать (characters.json → moods). Нет реакции = обычный портрет. */
export const MOOD_IDS = ['happy', 'sad', 'angry', 'surprised', 'scared', 'thinking', 'smug', 'embarrassed'] as const;
export type MoodId = typeof MOOD_IDS[number];
export type Facing = 'dr' | 'dl' | 'ur' | 'ul';
export type CursorKind = 'default' | 'hand' | 'eye' | 'gear' | 'talk' | 'exit';

export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;
export const INVENTORY_SIZE = 6;
