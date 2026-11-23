import { ALL_ITEM_IDS, FLAG_IDS, type LevelId } from '../game/data/types';
import type { SaveData } from './GameStateModel';

export const SAVE_KEY = 'onye-save-v1';
export const SETTINGS_KEY = 'onye-settings-v1';

export interface Settings { musicVolume: number; sfxVolume: number; textSpeed: 'slow' | 'normal' | 'fast'; fullscreen: boolean }
export const DEFAULT_SETTINGS: Settings = { musicVolume: 70, sfxVolume: 80, textSpeed: 'normal', fullscreen: false };

const LEVEL_IDS: readonly LevelId[] = ['L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08'];
const PART_IDS = ['PART_SPRING', 'PART_GEAR', 'PART_HANDS'];

function defaultStorage(): Storage | undefined {
    try {
        return typeof localStorage !== 'undefined' ? localStorage : undefined;
    } catch {
        return undefined;   // access to localStorage itself can throw (blocked cookies)
    }
}

function read(storage: Storage | undefined, key: string): unknown {
    if (!storage) return null;
    try {
        const raw = storage.getItem(key);
        return raw === null ? null : JSON.parse(raw);
    } catch {
        return null;
    }
}

function write(storage: Storage | undefined, key: string, value: unknown): void {
    if (!storage) return;
    try {
        storage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn(`[SaveService] cannot write "${key}"`, e);
    }
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isSaveData(v: unknown): v is SaveData {
    if (!isRecord(v) || v.version !== 2) return false;
    if (typeof v.levelId !== 'string' || !(LEVEL_IDS as readonly string[]).includes(v.levelId)) return false;
    if (v.screenId !== null && typeof v.screenId !== 'string') return false;
    if (!isRecord(v.flags) || !Object.entries(v.flags).every(([k, b]) => (FLAG_IDS as readonly string[]).includes(k) && typeof b === 'boolean')) return false;
    if (!Array.isArray(v.inventory) || !v.inventory.every(i => (ALL_ITEM_IDS as readonly unknown[]).includes(i))) return false;
    if (!Array.isArray(v.parts) || !v.parts.every(p => PART_IDS.includes(p as string))) return false;
    if (v.spitzName !== null && v.spitzName !== 1 && v.spitzName !== 2) return false;
    if (!Array.isArray(v.talksSeen) || !v.talksSeen.every(k => typeof k === 'string')) return false;
    return typeof v.completed === 'boolean' && typeof v.savedAt === 'string';
}

export function saveGame(d: SaveData, storage: Storage | undefined = defaultStorage()): void {
    write(storage, SAVE_KEY, d);
}

/** null: no save, corrupted, or version !== 2 (v1 отбрасывается: уровни переделаны). */
export function loadGame(storage: Storage | undefined = defaultStorage()): SaveData | null {
    const v = read(storage, SAVE_KEY);
    return isSaveData(v) ? v : null;
}

export function clearSave(storage: Storage | undefined = defaultStorage()): void {
    if (!storage) return;
    try {
        storage.removeItem(SAVE_KEY);
    } catch {
        // ignore
    }
}

/** Missing or invalid fields fall back to DEFAULT_SETTINGS. */
export function loadSettings(storage: Storage | undefined = defaultStorage()): Settings {
    const v = read(storage, SETTINGS_KEY);
    const s: Settings = { ...DEFAULT_SETTINGS };
    if (!isRecord(v)) return s;
    const vol = (x: unknown): number | undefined =>
        typeof x === 'number' && Number.isFinite(x) ? Math.min(100, Math.max(0, x)) : undefined;
    s.musicVolume = vol(v.musicVolume) ?? s.musicVolume;
    s.sfxVolume = vol(v.sfxVolume) ?? s.sfxVolume;
    if (v.textSpeed === 'slow' || v.textSpeed === 'normal' || v.textSpeed === 'fast') s.textSpeed = v.textSpeed;
    if (typeof v.fullscreen === 'boolean') s.fullscreen = v.fullscreen;
    return s;
}

export function saveSettings(s: Settings, storage: Storage | undefined = defaultStorage()): void {
    write(storage, SETTINGS_KEY, s);
}
