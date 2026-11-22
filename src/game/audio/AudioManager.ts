import { DEFAULT_SETTINGS, type Settings } from '../../state/SaveService';
import { effectiveVolume } from './volume';

export const CROSSFADE_MS = 1500;
const AMBIENT_FACTOR = 0.25;   // background noise stays quiet

/** The parts of Phaser's sound system the manager uses (kept small for tests). */
export interface SoundLike { key: string; volume: number; isPlaying: boolean; play(): unknown; stop(): unknown; destroy(): unknown; setVolume(v: number): unknown }
export interface SoundManagerLike {
    add(key: string, cfg: { loop?: boolean; volume?: number }): SoundLike;
    play(key: string, cfg?: { volume?: number }): unknown;
}

interface Track { key: string; sound: SoundLike; from: number; to: number; t0: number; stopAtEnd: boolean }

/**
 * Music with a 1.5 s crossfade (one track at a time), one-shot effects, quiet ambience.
 * Nothing sounds before unlock() (the first user interaction — browser rule). Missing files are skipped silently.
 */
export class AudioManager {
    private settings: Settings = { ...DEFAULT_SETTINGS };
    private paused = false;
    private unlocked = false;
    private wanted: string | null = null;          // music that should be playing
    private music: Track | null = null;
    private fading: Track[] = [];
    private ambientWanted: string | null = null;
    private ambient: SoundLike | null = null;

    constructor(
        private readonly mgr: SoundManagerLike,
        private readonly has: (key: string) => boolean,
        private readonly now: () => number,
    ) {}

    /** Call on the first pointerdown/keydown. */
    unlock(): void {
        if (this.unlocked) return;
        this.unlocked = true;
        this.startWanted();
        this.syncAmbient();
    }

    playMusic(key: string): void {
        if (this.wanted === key && (this.music?.key === key || !this.canPlayMusic())) return;
        this.wanted = key;
        this.startWanted();
    }

    playSfx(key: string): void {
        const v = effectiveVolume(this.settings.sfxVolume, false, false);
        if (!this.unlocked || v === 0 || !this.has(key)) return;
        this.mgr.play(key, { volume: v });
    }

    /** Background noise of the level (null = none). */
    playAmbient(key: string | null): void {
        this.ambientWanted = key;
        this.syncAmbient();
    }

    setPaused(p: boolean): void {
        this.paused = p;
        this.update();
    }

    applySettings(s: Settings): void {
        const wasSilent = this.settings.musicVolume === 0;
        this.settings = { ...s };
        if (s.musicVolume === 0) this.stopAllMusic();            // 0 = no music at all, not "quiet"
        else if (wasSilent) this.startWanted();
        this.syncAmbient();
        this.update();
    }

    /** Called every frame: fades and volume changes. */
    update(): void {
        const t = this.now();
        const target = this.musicVolume();
        if (this.music) {
            const m = this.music;
            m.to = target;
            const k = Math.min(1, (t - m.t0) / CROSSFADE_MS);
            m.sound.setVolume(m.from + (m.to - m.from) * k);
        }
        this.fading = this.fading.filter(f => {
            const k = Math.min(1, (t - f.t0) / CROSSFADE_MS);
            f.sound.setVolume(f.from * (1 - k));
            if (k < 1) return true;
            f.sound.stop();
            f.sound.destroy();
            return false;
        });
        if (this.ambient) this.ambient.setVolume(effectiveVolume(this.settings.sfxVolume, false, false) * AMBIENT_FACTOR);
    }

    private musicVolume(): number {
        return effectiveVolume(this.settings.musicVolume, this.paused, true);
    }

    private canPlayMusic(): boolean {
        return this.unlocked && this.settings.musicVolume > 0;
    }

    private startWanted(): void {
        if (!this.canPlayMusic()) return;
        const key = this.wanted;
        if (this.music?.key === key) return;
        if (this.music) {   // the old track fades out (only one track keeps playing)
            this.fading.push({ ...this.music, from: this.music.sound.volume, to: 0, t0: this.now(), stopAtEnd: true });
            this.music = null;
        }
        if (!key || !this.has(key)) return;   // no file yet: silence
        const sound = this.mgr.add(key, { loop: true, volume: 0 });
        sound.play();
        this.music = { key, sound, from: 0, to: this.musicVolume(), t0: this.now(), stopAtEnd: false };
    }

    private stopAllMusic(): void {
        for (const tr of [...this.fading, ...(this.music ? [this.music] : [])]) { tr.sound.stop(); tr.sound.destroy(); }
        this.fading = [];
        this.music = null;
    }

    private syncAmbient(): void {
        const v = effectiveVolume(this.settings.sfxVolume, false, false) * AMBIENT_FACTOR;
        const key = this.unlocked && v > 0 ? this.ambientWanted : null;
        if (this.ambient && this.ambient.key === key) return;
        if (this.ambient) { this.ambient.stop(); this.ambient.destroy(); this.ambient = null; }
        if (!key || !this.has(key)) return;
        this.ambient = this.mgr.add(key, { loop: true, volume: v });
        this.ambient.play();
    }
}

let instance: AudioManager | null = null;

/** The game-wide audio manager (created with the Phaser game). */
export function setAudio(a: AudioManager | null): void { instance = a; }
export function getAudio(): AudioManager | null { return instance; }
