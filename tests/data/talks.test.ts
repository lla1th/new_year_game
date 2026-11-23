import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { DialogsFile, TalksFile } from '../../src/game/data/schemas';
import { FLAG_IDS } from '../../src/game/data/types';

const read = <T>(p: string): T => JSON.parse(readFileSync(new URL(`../../public/data/${p}`, import.meta.url), 'utf8')) as T;
const ru = read<Record<string, string>>('texts/ru.json');
const dialogs = read<DialogsFile>('dialogs.json');
const talks = read<TalksFile>('talks.json');

describe('talks', () => {
  test('every topic points to an existing dialog and has a menu text', () => {
    for (const [id, def] of Object.entries(talks)) for (const t of def.topics) {
      expect(ru[t.menuKey], `${id}.${t.id}`).toBeDefined();
      if (!t.hint) expect(dialogs[t.dialog!], `${id}.${t.id}`).toBeDefined();
      else expect(t.dialog).toBeUndefined();
    }
    expect(ru['talk.bye']).toBe('Ладно, пока');
  });
  test('all talk characters from SCRIPT §12а exist', () => {
    expect(Object.keys(talks).sort()).toEqual(['cat', 'lekha', 'nika', 'spitz', 'sveta']);
  });
  test('every talk dialog line has a text and a speaker; flags are known', () => {
    for (const def of Object.values(talks)) for (const t of def.topics) {
      for (const f of [t.when, t.unless]) if (f) expect(FLAG_IDS).toContain(f);
      for (const l of t.dialog ? dialogs[t.dialog] : []) {
        expect(ru[l.key], l.key).toBeDefined();
        expect(l.speaker).toBeTruthy();
      }
    }
  });
  test('the spitz has the hint topic, and {spitz} in texts is resolved to {name.spitz}', () => {
    expect(talks.spitz.topics.some(t => t.hint)).toBe(true);
    for (const [k, v] of Object.entries(ru)) if (k.startsWith('talk.')) expect(v, k).not.toContain('{spitz}');
  });
});
