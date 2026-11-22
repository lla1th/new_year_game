import { describe, test, expect } from 'vitest';
import { GameStateModel } from '../../src/state/GameStateModel';
import type { ItemId } from '../../src/game/data/types';

describe('GameStateModel', () => {
  test('inventory, flags, save round-trip, reset', () => {
    const s = new GameStateModel();
    expect(s.levelId).toBe('L01');
    for (const id of ['ITEM_MANDARIN', 'ITEM_SAUSAGE', 'ITEM_BULB_GREEN', 'ITEM_BULB_GOLD', 'ITEM_BULB_BLUE', 'ITEM_COCOA'] as ItemId[]) expect(s.addItem(id)).toBe(true);
    expect(s.addItem('ITEM_VALVE')).toBe(false);     // 7th does not fit
    expect(s.addItem('ITEM_MANDARIN')).toBe(false);  // duplicate
    s.removeItem('ITEM_SAUSAGE');
    expect(s.inventory).not.toContain('ITEM_SAUSAGE');
    s.setFlag('L01_SPITZ_FREED');
    expect(s.hasFlag('L01_SPITZ_FREED')).toBe(true);
    const d = s.toSaveData(new Date('2026-12-31T20:00:00Z'));
    expect(d).toMatchObject({ version: 1, levelId: 'L01', savedAt: '2026-12-31T20:00:00.000Z' });
    const t = new GameStateModel();
    t.loadFrom(d);
    expect(t.inventory).toEqual(s.inventory);
    t.reset();
    expect(t.inventory).toEqual([]);
    expect(t.flags).toEqual({});
  });

  test('save data is a snapshot, not a live reference', () => {
    const s = new GameStateModel();
    s.addItem('ITEM_MANDARIN');
    const d = s.toSaveData();
    s.addItem('ITEM_SAUSAGE');
    s.setFlag('L01_PORTAL_OPEN');
    expect(d.inventory).toEqual(['ITEM_MANDARIN']);
    expect(d.flags).toEqual({});
    const t = new GameStateModel();
    t.loadFrom(d);
    t.addItem('ITEM_COCOA');
    expect(d.inventory).toEqual(['ITEM_MANDARIN']);
  });

  test('parts and hasItem', () => {
    const s = new GameStateModel();
    s.addPart('PART_GEAR');
    s.addPart('PART_GEAR');
    expect(s.parts).toEqual(['PART_GEAR']);
    s.removePart('PART_GEAR');
    expect(s.parts).toEqual([]);
    expect(s.hasItem('ITEM_MANDARIN')).toBe(false);
    s.addItem('ITEM_MANDARIN');
    expect(s.hasItem('ITEM_MANDARIN')).toBe(true);
  });
});
