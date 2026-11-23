import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_RULES, beatsRecord, boardWithKeeperName, boardWithPlayer, displayName, scoreHits, topScore,
  type BoardRow,
} from '../../src/puzzles/logic/gallery';

const empty = (): BoardRow[] => [
  { name: 'Шпиц-хранитель', points: null }, ...Array.from({ length: 4 }, () => ({ name: null, points: null })),
];

describe('S-02b gallery', () => {
  test('draft rules: 20 shots, red 1, gold 3, black −2', () => {
    expect(DEFAULT_RULES.shots).toBe(20);
    expect(DEFAULT_RULES.points).toEqual({ red: 1, gold: 3, black: -2 });
  });

  test('scoring, a negative total does not break anything', () => {
    expect(scoreHits(['red', 'gold', 'gold', 'black'], DEFAULT_RULES)).toBe(1 + 3 + 3 - 2);
    expect(scoreHits(['black', 'black'], DEFAULT_RULES)).toBe(-4);
    expect(scoreHits([], DEFAULT_RULES)).toBe(0);
  });

  test('an empty author table falls back to the draft record; the record must be strictly beaten', () => {
    const board = empty();
    expect(topScore(board, DEFAULT_RULES)).toBe(DEFAULT_RULES.fallbackTop);
    expect(beatsRecord(DEFAULT_RULES.fallbackTop, board, DEFAULT_RULES)).toBe(false);
    expect(beatsRecord(DEFAULT_RULES.fallbackTop + 1, board, DEFAULT_RULES)).toBe(true);
    const filled = [{ name: 'Шпиц-хранитель', points: 30 }, ...board.slice(1)];
    expect(topScore(filled, DEFAULT_RULES)).toBe(30);
    expect(beatsRecord(25, filled, DEFAULT_RULES)).toBe(false);
  });

  test('the keeper row gets the chosen name of the spitz; without a choice it stays as is', () => {
    expect(boardWithKeeperName(empty(), 'Бублик')[0].name).toBe('Бублик');
    expect(boardWithKeeperName(empty(), null)[0].name).toBe('Шпиц-хранитель');
    expect(boardWithKeeperName(empty(), 'Бублик').slice(1)).toEqual(empty().slice(1));
  });

  test('the player goes first, the table stays five rows long', () => {
    const b = boardWithPlayer(empty(), 'Ксюша', 99);
    expect(b).toHaveLength(5);
    expect(b[0]).toEqual({ name: 'Ксюша', points: 99 });
    expect(b[1].name).toBe('Шпиц-хранитель');
  });

  test('blank names are shown as a dash', () => {
    expect(displayName({ name: null, points: null })).toBe('—');
    expect(displayName({ name: '', points: 3 })).toBe('—');
    expect(displayName({ name: 'Ника', points: 3 })).toBe('Ника');
  });

  test('gallery.json has the draft rules and a five-row table with the keeper first', () => {
    const j = JSON.parse(readFileSync(new URL('../../public/data/gallery.json', import.meta.url), 'utf8'));
    expect(j.rules).toEqual(DEFAULT_RULES);
    expect(j.board).toHaveLength(5);
    expect(j.board[0].name).toBe('Шпиц-хранитель');
  });
});
