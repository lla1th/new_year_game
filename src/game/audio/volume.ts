import { LEVEL_STYLE, type LevelId } from '../data/types';

/** Paused game: music is dimmed to 30 % (AUDIO_DESIGN). */
export const PAUSE_MUSIC_FACTOR = 0.3;

/** 0..1 volume for a 0..100 setting. */
export function effectiveVolume(setting0to100: number, paused: boolean, isMusic: boolean): number {
    const v = Math.min(1, Math.max(0, setting0to100 / 100));
    return paused && isMusic ? v * PAUSE_MUSIC_FACTOR : v;
}

export type MusicId = 'mus_menu' | 'mus_world1' | 'mus_world2' | 'mus_world3' | 'mus_finale';

export function musicForLevel(level: LevelId): 'mus_world1' | 'mus_world2' | 'mus_world3' | 'mus_finale' {
    const s = LEVEL_STYLE[level];
    return s === 'w1' ? 'mus_world1' : s === 'w2' ? 'mus_world2' : s === 'w3' ? 'mus_world3' : 'mus_finale';
}

/** Quiet background noise of a level (AUDIO_DESIGN §2), or null. */
export function ambientForLevel(level: LevelId): string | null {
    return ({ L02: 'amb_fair', L04: 'amb_factory', L05: 'amb_freezer', L06: 'amb_city', L07: 'amb_city' } as Partial<Record<LevelId, string>>)[level] ?? null;
}
