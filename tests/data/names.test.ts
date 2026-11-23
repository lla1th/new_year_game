import { test, expect } from 'vitest';
import { spitzDisplayName, applyNameChoice } from '../../src/game/data/names';
import { GameStateModel } from '../../src/state/GameStateModel';

test('spitz name falls back to «Шпиц» until chosen', () => {
  const dict = { 'name.option.1': 'Рыжик', 'name.option.2': 'Бублик' };
  expect(spitzDisplayName(null, dict)).toBe('Шпиц');
  expect(spitzDisplayName(2, dict)).toBe('Бублик');
  expect(spitzDisplayName(1, {})).toBe('Шпиц');         // поле автора не заполнено
});

test('option 3 (Marat) is locked and changes nothing', () => {
  const s = new GameStateModel();
  expect(applyNameChoice(s, 3)).toBe('locked');
  expect(s.spitzName).toBeNull(); expect(s.hasFlag('L01_NAME_CHOSEN')).toBe(false);
});
test('options 1 and 2 are chosen and flagged', () => {
  const s = new GameStateModel();
  expect(applyNameChoice(s, 2)).toBe('chosen');
  expect(s.spitzName).toBe(2); expect(s.hasFlag('L01_NAME_CHOSEN')).toBe(true);
});
