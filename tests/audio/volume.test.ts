import { describe, test, expect } from 'vitest';
import { effectiveVolume, musicForLevel } from '../../src/game/audio/volume';
import { AudioManager, CROSSFADE_MS, type SoundManagerLike, type SoundLike } from '../../src/game/audio/AudioManager';
import { DEFAULT_SETTINGS } from '../../src/state/SaveService';

describe('volume', () => {
  test('effective volume; pause dims music to 30 %', () => {
    expect(effectiveVolume(70, false, true)).toBeCloseTo(0.7);
    expect(effectiveVolume(70, true, true)).toBeCloseTo(0.21);
    expect(effectiveVolume(80, true, false)).toBeCloseTo(0.8);
    expect(effectiveVolume(0, false, true)).toBe(0);
    expect(effectiveVolume(150, false, false)).toBe(1);
  });
  test('music per world', () => {
    expect(musicForLevel('L01')).toBe('mus_world1'); expect(musicForLevel('L03')).toBe('mus_world1');
    expect(musicForLevel('L05')).toBe('mus_world2');
    expect(musicForLevel('L07')).toBe('mus_world3'); expect(musicForLevel('L08')).toBe('mus_finale');
  });
});

function fakeSound(files: string[]) {
  const sounds: (SoundLike & { stopped: boolean })[] = [];
  const oneShots: { key: string; volume: number }[] = [];
  const mgr: SoundManagerLike = {
    add: (key, cfg) => {
      const s = { key, volume: cfg.volume ?? 1, isPlaying: false, stopped: false,
        play() { this.isPlaying = true; }, stop() { this.isPlaying = false; this.stopped = true; }, destroy() {}, setVolume(v: number) { this.volume = v; return this; } };
      sounds.push(s);
      return s;
    },
    play: (key, cfg) => { oneShots.push({ key, volume: cfg?.volume ?? 1 }); return true; },
  };
  let t = 0;
  const am = new AudioManager(mgr, k => files.includes(k), () => t);
  const playing = () => sounds.filter(s => s.isPlaying);
  return { am, sounds, oneShots, playing, advance: (ms: number) => { t += ms; am.update(); } };
}

describe('AudioManager', () => {
  test('nothing plays before the first interaction; then the requested music starts', () => {
    const f = fakeSound(['mus_menu']);
    f.am.playMusic('mus_menu');
    expect(f.playing()).toHaveLength(0);
    f.am.unlock();
    expect(f.playing().map(s => s.key)).toEqual(['mus_menu']);
    f.advance(CROSSFADE_MS);
    expect(f.playing()[0].volume).toBeCloseTo(0.7);
  });

  test('music volume 0: music does not play at all, a world change does not start it', () => {
    const f = fakeSound(['mus_world1', 'mus_world2']);
    f.am.unlock();
    f.am.applySettings({ ...DEFAULT_SETTINGS, musicVolume: 0 });
    f.am.playMusic('mus_world1');
    f.am.playMusic('mus_world2');
    expect(f.playing()).toHaveLength(0);
    f.am.applySettings({ ...DEFAULT_SETTINGS, musicVolume: 50 });   // turned up again → the current world's track starts
    expect(f.playing().map(s => s.key)).toEqual(['mus_world2']);
  });

  test('fast level changes: the old tracks stop, only one keeps playing', () => {
    const f = fakeSound(['mus_world1', 'mus_world2', 'mus_world3']);
    f.am.unlock();
    f.am.playMusic('mus_world1');
    f.advance(200);
    f.am.playMusic('mus_world3');
    f.advance(100);
    f.am.playMusic('mus_world2');
    f.advance(CROSSFADE_MS + 10);
    expect(f.playing().map(s => s.key)).toEqual(['mus_world2']);
  });

  test('crossfade 1.5 s; the same track is not restarted', () => {
    const f = fakeSound(['mus_world1', 'mus_world2']);
    f.am.unlock();
    f.am.playMusic('mus_world1'); f.advance(CROSSFADE_MS);
    const first = f.playing()[0];
    f.am.playMusic('mus_world1');
    expect(f.playing()).toEqual([first]);
    f.am.playMusic('mus_world2'); f.advance(CROSSFADE_MS / 2);
    expect(f.playing()).toHaveLength(2);
    expect(first.volume).toBeCloseTo(0.35, 1);
    f.advance(CROSSFADE_MS / 2 + 1);
    expect(f.playing().map(s => s.key)).toEqual(['mus_world2']);
  });

  test('pause dims the music to 30 %', () => {
    const f = fakeSound(['mus_world1']);
    f.am.unlock(); f.am.playMusic('mus_world1'); f.advance(CROSSFADE_MS);
    f.am.setPaused(true); f.advance(16);
    expect(f.playing()[0].volume).toBeCloseTo(0.21);
    f.am.setPaused(false); f.advance(16);
    expect(f.playing()[0].volume).toBeCloseTo(0.7);
  });

  test('sound effects: missing file or volume 0 → silently skipped', () => {
    const f = fakeSound(['sfx_click']);
    f.am.playSfx('sfx_click');                       // locked: nothing
    f.am.unlock();
    f.am.playSfx('sfx_click'); f.am.playSfx('sfx_nope');
    expect(f.oneShots).toEqual([{ key: 'sfx_click', volume: 0.8 }]);
    f.am.applySettings({ ...DEFAULT_SETTINGS, sfxVolume: 0 });
    f.am.playSfx('sfx_click');
    expect(f.oneShots).toHaveLength(1);
  });

  test('per-effect gain follows the global sound effects volume', () => {
    const f = fakeSound(['sfx_clock_tick']);
    f.am.unlock();
    f.am.playSfx('sfx_clock_tick', 0.25);
    f.am.playSfx('sfx_clock_tick', 0);
    expect(f.oneShots).toEqual([{ key: 'sfx_clock_tick', volume: 0.2 }]);
  });

  test('a missing music file: the old track fades out, nothing new starts', () => {
    const f = fakeSound(['mus_world1']);
    f.am.unlock(); f.am.playMusic('mus_world1'); f.advance(CROSSFADE_MS);
    f.am.playMusic('mus_world3'); f.advance(CROSSFADE_MS + 1);
    expect(f.playing()).toHaveLength(0);
  });
});

test('music requested before its file finished loading starts once the files arrive (refresh)', () => {
  const files: string[] = [];
  const sounds: SoundLike[] = [];
  const mgr: SoundManagerLike = {
    add: (key, cfg) => { const s = { key, volume: cfg.volume ?? 1, isPlaying: false, play() { this.isPlaying = true; }, stop() { this.isPlaying = false; }, destroy() {}, setVolume(v: number) { this.volume = v; } }; sounds.push(s); return s; },
    play: () => true,
  };
  const am = new AudioManager(mgr, k => files.includes(k), () => 0);
  am.playMusic('mus_menu');
  am.unlock();                       // the first click comes before mus_menu is loaded
  expect(sounds).toHaveLength(0);
  files.push('mus_menu');
  am.refresh();                      // BootScene: audio files loaded
  expect(sounds.filter(s => s.isPlaying).map(s => s.key)).toEqual(['mus_menu']);
});
