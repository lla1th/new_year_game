import { describe, test, expect } from 'vitest';
import { GameStateModel } from '../../src/state/GameStateModel';
import {
  SAVE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS, saveGame, loadGame, clearSave, loadSettings, saveSettings,
} from '../../src/state/SaveService';

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => { m.delete(k); },
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
  };
}

describe('SaveService', () => {
  const s = new GameStateModel();
  s.addItem('ITEM_MANDARIN');
  s.setFlag('L01_SPITZ_FREED');
  const d = s.toSaveData(new Date('2026-12-31T20:00:00Z'));

  test('save / load / corrupted / wrong version', () => {
    const fake = fakeStorage();
    expect(loadGame(fake)).toBeNull();
    saveGame(d, fake);
    expect(loadGame(fake)).toEqual(d);
    fake.setItem(SAVE_KEY, '{oops');
    expect(loadGame(fake)).toBeNull();
    fake.setItem(SAVE_KEY, JSON.stringify({ ...d, version: 3 }));
    expect(loadGame(fake)).toBeNull();
  });

  test('a version 1 save is ignored', () => {
    const fake = fakeStorage();
    fake.setItem(SAVE_KEY, JSON.stringify({ version: 1, levelId: 'L03', screenId: null, flags: {}, inventory: [], parts: [], completed: false, savedAt: '' }));
    expect(loadGame(fake)).toBeNull();
  });

  test('invalid spitzName / talksSeen → null', () => {
    const fake = fakeStorage();
    fake.setItem(SAVE_KEY, JSON.stringify({ ...d, spitzName: 3 }));
    expect(loadGame(fake)).toBeNull();
    fake.setItem(SAVE_KEY, JSON.stringify({ ...d, talksSeen: 'x' }));
    expect(loadGame(fake)).toBeNull();
  });

  test('structurally invalid save → null', () => {
    const fake = fakeStorage();
    fake.setItem(SAVE_KEY, JSON.stringify({ ...d, levelId: 'L99' }));
    expect(loadGame(fake)).toBeNull();
    fake.setItem(SAVE_KEY, JSON.stringify({ ...d, inventory: 'x' }));
    expect(loadGame(fake)).toBeNull();
    fake.setItem(SAVE_KEY, 'null');
    expect(loadGame(fake)).toBeNull();
  });

  test('clearSave', () => {
    const fake = fakeStorage();
    saveGame(d, fake);
    clearSave(fake);
    expect(loadGame(fake)).toBeNull();
  });

  test('settings: defaults for missing fields, round-trip, garbage', () => {
    const fake = fakeStorage();
    expect(loadSettings(fake)).toEqual(DEFAULT_SETTINGS);
    fake.setItem(SETTINGS_KEY, JSON.stringify({ musicVolume: 10 }));
    expect(loadSettings(fake)).toEqual({ ...DEFAULT_SETTINGS, musicVolume: 10 });
    saveSettings({ ...DEFAULT_SETTINGS, textSpeed: 'fast' }, fake);
    expect(loadSettings(fake).textSpeed).toBe('fast');
    fake.setItem(SETTINGS_KEY, '{bad');
    expect(loadSettings(fake)).toEqual(DEFAULT_SETTINGS);
    fake.setItem(SETTINGS_KEY, JSON.stringify({ musicVolume: 'loud', textSpeed: 'warp' }));
    expect(loadSettings(fake)).toEqual(DEFAULT_SETTINGS);
  });

  test('storage that throws (private mode) does not break the game', () => {
    const broken = { ...fakeStorage(), getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } } as Storage;
    expect(loadGame(broken)).toBeNull();
    expect(() => saveGame(d, broken)).not.toThrow();
    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
  });
});
