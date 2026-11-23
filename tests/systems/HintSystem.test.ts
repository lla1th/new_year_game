import { test, expect } from 'vitest';
import { HintSystem, AUTO_HINT_MS } from '../../src/game/systems/HintSystem';
import type { Goal } from '../../src/game/script/types';
import type { FlagId } from '../../src/game/data/types';

test('hint steps, goal switching, auto hint timer', () => {
  expect(AUTO_HINT_MS).toBe(90_000);
  const goals: Goal[] = [{ flag: 'L01_SPITZ_FREED', hintKeys: ['h1', 'h2', 'h3'] }, { flag: 'L01_PORTAL_OPEN', hintKeys: ['p1', 'p2', 'p3'] }];
  const flags = new Set<FlagId>();
  let t = 0;
  const h = new HintSystem(goals, f => flags.has(f), () => t);
  expect(h.currentGoal()?.flag).toBe('L01_SPITZ_FREED');
  expect([h.nextHint(), h.nextHint(), h.nextHint(), h.nextHint()]).toEqual(['h1', 'h2', 'h3', 'h3']);
  flags.add('L01_SPITZ_FREED'); h.notifyProgress(); expect(h.nextHint()).toBe('p1');
  t = 0; h.notifyProgress(); t = 89_999; expect(h.tick()).toBeNull();
  t = 90_000; expect(h.tick()).toBe('p2'); expect(h.tick()).toBeNull();   // timer reset
  flags.add('L01_PORTAL_OPEN'); h.notifyProgress(); expect(h.currentGoal()).toBeNull(); expect(h.nextHint()).toBeNull();
  t = 500_000; expect(h.tick()).toBeNull();
});

test('a manual hint also restarts the auto-hint timer', () => {
  const goals: Goal[] = [{ flag: 'L01_SPITZ_FREED', hintKeys: ['h1', 'h2', 'h3'] }];
  let t = 0;
  const h = new HintSystem(goals, () => false, () => t);
  t = 60_000; expect(h.nextHint()).toBe('h1');
  t = 120_000; expect(h.tick()).toBeNull();
  t = 150_000; expect(h.tick()).toBe('h2');
});

test('goal completed without notifyProgress is still skipped', () => {
  const goals: Goal[] = [{ flag: 'L01_SPITZ_FREED', hintKeys: ['h1', 'h2', 'h3'] }, { flag: 'L01_PORTAL_OPEN', hintKeys: ['p1', 'p2', 'p3'] }];
  const flags = new Set<FlagId>(['L01_SPITZ_FREED']);
  const h = new HintSystem(goals, f => flags.has(f), () => 0);
  expect(h.nextHint()).toBe('p1');
});
