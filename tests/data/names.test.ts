import { test, expect } from 'vitest';
import { spitzDisplayName } from '../../src/game/data/names';

test('spitz name falls back to «Шпиц» until chosen', () => {
  const dict = { 'name.option.1': 'Рыжик', 'name.option.2': 'Бублик' };
  expect(spitzDisplayName(null, dict)).toBe('Шпиц');
  expect(spitzDisplayName(2, dict)).toBe('Бублик');
  expect(spitzDisplayName(1, {})).toBe('Шпиц');         // поле автора не заполнено
});
