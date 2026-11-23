import { test, expect } from 'vitest';
import { parseScriptTables } from '../../tools/scriptTexts';

const md = [
  '| Ключ | Кто | Текст |', '|---|---|---|',
  '| `l01.dlg.intro.1` | Шпиц | «Спасибо! Колбаса — мой любимый вид спасения!» | PROPOSED |',
  '| `l01.dlg.name.4` | Ксюша | «{spitz}. Решено. Хихик.» (после выбора) | НОВОЕ |',
  '| `l02.monkey.name` | Имя обезьянки | **[ЗАПОЛНИТЬ: ________]** |',
  '| `l02.mix` | Ксюша: «А» Леха: «Б» |',
  '| `l04.ginger.talk` | «Не отдам руль!» |',
].join('\n');

test('parses key rows and text', () => {
  const r = parseScriptTables(md);
  expect(r.texts['l01.dlg.intro.1']).toBe('Спасибо! Колбаса — мой любимый вид спасения!');
  expect(r.texts['l01.dlg.name.4']).toBe('{name.spitz}. Решено. Хихик.');
  expect(r.texts['l04.ginger.talk']).toBe('Не отдам руль!');
});
test('blank rows get a visible placeholder and are reported', () => {
  const r = parseScriptTables(md);
  expect(r.blanks).toEqual(['l02.monkey.name']);
  expect(r.texts['l02.monkey.name']).toBe('⟨заполнить: l02.monkey.name⟩');
});
test('two speakers in one cell are skipped, not merged', () => {
  const r = parseScriptTables(md);
  expect(r.skipped).toEqual(['l02.mix']);
  expect(r.texts['l02.mix']).toBeUndefined();
});
