import { test, expect } from 'vitest';
import { startStateFor } from '../../src/game/levels/startState';
import type { LevelId } from '../../src/game/data/types';

test('start state for the level select', () => {
  expect(startStateFor('L01')).toEqual({ inventory: [], parts: [], flags: {} });
  expect(startStateFor('L03')).toMatchObject({ inventory: ['ITEM_COCOA'], parts: [] });
  expect(startStateFor('L04')).toMatchObject({ inventory: [], parts: ['PART_SPRING'] });
  expect(startStateFor('L05')).toMatchObject({ inventory: ['ITEM_MITTENS'], parts: ['PART_SPRING'] });
  expect(startStateFor('L06').parts).toEqual(['PART_SPRING', 'PART_GEAR']);
  expect(startStateFor('L07').parts).toEqual(['PART_SPRING', 'PART_GEAR']);
  expect(startStateFor('L08').parts).toEqual(['PART_SPRING', 'PART_GEAR', 'PART_HANDS']);
  for (const l of ['L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08'] as LevelId[]) expect(startStateFor(l).flags.L01_SPITZ_FREED, l).toBe(true);
  const a = startStateFor('L05'); a.inventory.push('ITEM_COCOA');
  expect(startStateFor('L05').inventory).toEqual(['ITEM_MITTENS']);   // a fresh copy every time
  expect(startStateFor('L07').inventory).toEqual(['ITEM_PENCIL']);
  expect(startStateFor('L02').flags).toMatchObject({ L01_BRIEFING_DONE: true, L01_NAME_CHOSEN: true });
  expect(startStateFor('L02').flags.L02_FINISHED).toBeUndefined();
  for (const l of ['L03', 'L04', 'L05', 'L06', 'L07', 'L08'] as LevelId[]) expect(startStateFor(l).flags.L02_FINISHED, l).toBe(true);
});
