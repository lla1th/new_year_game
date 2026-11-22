import { test, expect } from 'vitest';
import { charsVisible, TEXT_SPEED_CPS } from '../../src/ui/typewriter';

test('charsVisible', () => {
  expect(TEXT_SPEED_CPS).toEqual({ slow: 30, normal: 40, fast: 60 });
  expect(charsVisible(0, 'normal', 100)).toBe(0);
  expect(charsVisible(1000, 'normal', 100)).toBe(40);
  expect(charsVisible(1000, 'slow', 100)).toBe(30);
  expect(charsVisible(1000, 'fast', 10)).toBe(10);       // not more than total
  expect(charsVisible(-5, 'fast', 10)).toBe(0);
  expect(charsVisible(500, 'fast', 100)).toBe(30);
});

test('charsVisibleCps: the ending card prints at 25 characters per second', async () => {
  const { charsVisibleCps, CARD_CPS } = await import('../../src/ui/typewriter');
  expect(CARD_CPS).toBe(25);
  expect(charsVisibleCps(1000, CARD_CPS, 100)).toBe(25);
  expect(charsVisibleCps(10_000, CARD_CPS, 100)).toBe(100);
  expect(charsVisibleCps(0, CARD_CPS, 100)).toBe(0);
});
