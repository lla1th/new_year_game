import { test, expect } from 'vitest';
import { ALL_ITEM_IDS, FLAG_IDS } from '../../src/game/data/types';

test('ID registries have no duplicates', () => {
  expect(new Set(ALL_ITEM_IDS).size).toBe(ALL_ITEM_IDS.length);
  expect(new Set(FLAG_IDS).size).toBe(FLAG_IDS.length);
});
test('new items and flags are registered', () => {
  for (const id of ['ITEM_FOIL', 'ITEM_PUMP', 'ITEM_PENCIL', 'ITEM_WIND_KEY']) expect(ALL_ITEM_IDS).toContain(id);
  for (const f of ['L01_BRIEFING_DONE', 'L01_TREE_SEEN', 'L01_TERRARIUM_SEEN', 'L02_GENERATOR_ON', 'L05_SEMYON_PASSED', 'L08_OUTFIT_DONE']) expect(FLAG_IDS).toContain(f);
});
test('flag ids follow the level prefix convention', () => {
  for (const f of FLAG_IDS) expect(f).toMatch(/^(L0[1-8]_[A-Z_]+|GAME_COMPLETED)$/);
});
