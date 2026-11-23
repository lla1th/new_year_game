import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ALL_ITEM_IDS } from '../../src/game/data/types';
import type { CharactersFile, DialogsFile, ItemsFile } from '../../src/game/data/schemas';

const read = <T>(p: string): T => JSON.parse(readFileSync(new URL(`../../public/data/${p}`, import.meta.url), 'utf8')) as T;
const ru = read<Record<string, string>>('texts/ru.json');
const items = read<ItemsFile>('items.json');
const dialogs = read<DialogsFile>('dialogs.json');
const characters = read<CharactersFile>('characters.json');

describe('data files', () => {
  test('all items are described', () => {
    expect(Object.keys(items).sort()).toEqual([...ALL_ITEM_IDS].sort());
  });
  test('every dialog line and choice has a text', () => {
    for (const line of Object.values(dialogs).flat()) {
      expect(ru[line.key], line.key).toBeDefined();
      for (const c of line.choices ?? []) {
        expect(ru[c.key], c.key).toBeDefined();
        if (c.reply) expect(ru[c.reply.key], c.reply.key).toBeDefined();
      }
    }
  });
  test('item names and inspect texts exist', () => {
    for (const def of Object.values(items)) {
      expect(ru[def.nameKey], def.nameKey).toBeDefined();
      expect(ru[def.inspectKey], def.inspectKey).toBeDefined();
    }
  });
  test('at least 5 wrong-item phrases', () => {
    expect(Object.keys(ru).filter(k => k.startsWith('common.wrongItem.')).length).toBeGreaterThanOrEqual(5);
  });
  test('l01_intro dialog has 6 lines; line 4 is the exact catchphrase', () => {
    expect(dialogs.l01_intro).toHaveLength(6);
    expect(ru['l01.dlg.intro.4']).toBe('Вот такая ху*ня, собачка.');
  });
  test('names for every speaker', () => {
    for (const id of ['ksyusha', 'spitz', 'cat', 'snail', 'nika', 'lekha', 'owl', 'snowman', 'ginger']) {
      expect(characters.names[id as keyof CharactersFile['names']], id).toBeTruthy();
    }
  });
  test('every speaker has a name', () => {
    for (const id of ['sveta', 'vendor', 'monkey', 'timofey', 'grisha', 'marmeladych', 'klava', 'semyon', 'cactus', 'crow', 'bambah', 'tik', 'tak', 'pendulum', 'mask', 'stranger'])
      expect(characters.names[id as keyof typeof characters.names], id).toBeDefined();
  });
  test('texts contain no {name.x} placeholders for unknown characters', () => {
    for (const [k, v] of Object.entries(ru)) {
      for (const m of v.matchAll(/\{name\.(\w+)\}/g)) expect(characters.names, k).toHaveProperty(m[1]);
    }
  });
});
