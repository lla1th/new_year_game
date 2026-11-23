import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolvePortrait } from '../../src/game/data/portraits';
import { MOOD_IDS } from '../../src/game/data/types';
import type { CharactersFile, DialogsFile } from '../../src/game/data/schemas';

const chars: CharactersFile = {
  names: {} as CharactersFile['names'],
  portraits: { spitz: { w1: 'n.png' } },
  moods: { spitz: { happy: { w1: 'h.png' } } },
};

describe('resolvePortrait', () => {
  test('mood portrait wins, falls back to the neutral one', () => {
    expect(resolvePortrait(chars, 'spitz', 'w1', 'happy')).toBe('h.png');
    expect(resolvePortrait(chars, 'spitz', 'w1', 'sad')).toBe('n.png');
    expect(resolvePortrait(chars, 'spitz', 'w1')).toBe('n.png');
    expect(resolvePortrait(chars, 'spitz', 'w2', 'happy')).toBeUndefined();
  });
});

describe('moods in data', () => {
  const read = <T>(f: string): T => JSON.parse(readFileSync(`public/data/${f}`, 'utf-8'));
  test('moods in characters.json and dialogs.json are known ids', () => {
    const known = new Set<string>(MOOD_IDS);
    const c = read<CharactersFile>('characters.json');
    for (const m of Object.values(c.moods ?? {})) for (const id of Object.keys(m)) expect(known.has(id), id).toBe(true);
    const used = Object.values(read<DialogsFile>('dialogs.json')).flat()
      .flatMap(l => [l.mood, ...(l.choices ?? []).flatMap(ch => [ch.mood, ch.reply?.mood])]);
    for (const id of used) if (id) expect(known.has(id), id).toBe(true);
  });
});
