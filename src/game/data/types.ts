export type LevelId = 'L01' | 'L02' | 'L03' | 'L04' | 'L05' | 'L06' | 'L07' | 'L08';
export type WorldStyle = 'w1' | 'w2' | 'w3' | 'fin';
export const LEVEL_STYLE: Record<LevelId, WorldStyle> =
  { L01: 'w1', L02: 'w1', L03: 'w1', L04: 'w2', L05: 'w2', L06: 'w3', L07: 'w3', L08: 'fin' };

export type ItemId =
  | 'ITEM_MANDARIN' | 'ITEM_SAUSAGE'
  | 'ITEM_BULB_GREEN' | 'ITEM_BULB_GOLD' | 'ITEM_BULB_BLUE'
  | 'ITEM_GATE_KEY' | 'ITEM_COCOA'
  | 'ITEM_CANDY_CANE' | 'ITEM_VALVE' | 'ITEM_MITTENS'
  | 'ITEM_RIBBON' | 'ITEM_GINGER_MEDAL' | 'ITEM_KEEPER_MEDAL';

export const ALL_ITEM_IDS: readonly ItemId[] = [
  'ITEM_MANDARIN', 'ITEM_SAUSAGE', 'ITEM_BULB_GREEN', 'ITEM_BULB_GOLD', 'ITEM_BULB_BLUE',
  'ITEM_GATE_KEY', 'ITEM_COCOA', 'ITEM_CANDY_CANE', 'ITEM_VALVE', 'ITEM_MITTENS',
  'ITEM_RIBBON', 'ITEM_GINGER_MEDAL', 'ITEM_KEEPER_MEDAL',
];

export type PartId = 'PART_SPRING' | 'PART_GEAR' | 'PART_HANDS';

export const FLAG_IDS = [
  'L01_SPITZ_FREED', 'L01_PORTAL_OPEN', 'L01_PORTAL_ENTERED',
  'L02_SNOWMAN_SAD', 'L02_SNOWMAN_HAPPY', 'L02_CAROUSEL_SPUN', 'L02_GARLAND_DONE', 'L02_GATE_OPEN',
  'L03_DOOR_OPEN', 'L03_OWL_AWAKE', 'L03_FRESCO_SEEN', 'L03_BELLS_DONE',
  'L04_VALVE_TAKEN', 'L04_VALVE_INSTALLED', 'L04_PIPES_DONE',
  'L05_ENTERED', 'L05_CRATES_DONE',
  'L06_BRIDGE_DONE',
  'L07_DRAWING_FOUND', 'L07_RIBBON_GIVEN', 'L07_MEDAL_GIVEN', 'L07_CAT_RECONCILED',
  'L08_PARTS_INSERTED', 'L08_GIFT_OPENED',
  'GAME_COMPLETED',
] as const;
export type FlagId = typeof FLAG_IDS[number];

export type PuzzleId = 'P-02' | 'P-03' | 'P-04' | 'P-05' | 'P-06' | 'P-08'
  | 'fridge' | 'fresco' | 'drawing' | 'clock';   // приближённые экраны без логики головоломки тоже открываются как «puzzle»

export type SpeakerId = 'ksyusha' | 'spitz' | 'cat' | 'snail' | 'nika' | 'lekha' | 'owl' | 'snowman' | 'ginger';
export type Facing = 'dr' | 'dl' | 'ur' | 'ul';
export type CursorKind = 'default' | 'hand' | 'eye' | 'gear' | 'talk' | 'exit';

export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;
export const INVENTORY_SIZE = 6;
