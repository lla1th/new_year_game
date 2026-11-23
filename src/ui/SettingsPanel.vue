<script setup lang="ts">
import { getGameData } from '../game/data/gameData';
import { saveSettings } from '../state/SaveService';
import { fullscreenSupported, setFullscreen } from './fullscreen';
import { uiState } from './uiState';
import type { TextSpeed } from './typewriter';

const emit = defineEmits<{ back: [] }>();
const t = (k: string) => getGameData()!.texts.t(k);
const speeds: TextSpeed[] = ['slow', 'normal', 'fast'];
const fsSupported = fullscreenSupported();

/** Settings are saved immediately on every change. */
function save () {
    saveSettings({ ...uiState.settings });
}
function setVolume (key: 'musicVolume' | 'sfxVolume', e: Event) {
    uiState.settings[key] = Number((e.target as HTMLInputElement).value);
    save();
}
function setSpeed (s: TextSpeed) {
    uiState.settings.textSpeed = s;
    save();
}
async function toggleFullscreen () {
    const on = !uiState.settings.fullscreen;
    uiState.settings.fullscreen = on;
    save();
    await setFullscreen(on);
}
</script>

<template>
    <div class="panel" data-test="settings">
        <h2>{{ t('ui.settings.title') }}</h2>
        <label class="row">
            <span>{{ t('ui.settings.music') }}</span>
            <input type="range" min="0" max="100" :value="uiState.settings.musicVolume" data-test="music" @input="setVolume('musicVolume', $event)" />
            <b>{{ uiState.settings.musicVolume }}</b>
        </label>
        <label class="row">
            <span>{{ t('ui.settings.sfx') }}</span>
            <input type="range" min="0" max="100" :value="uiState.settings.sfxVolume" data-test="sfx" @input="setVolume('sfxVolume', $event)" />
            <b>{{ uiState.settings.sfxVolume }}</b>
        </label>
        <div class="row">
            <span>{{ t('ui.settings.textSpeed') }}</span>
            <div class="seg">
                <button v-for="s in speeds" :key="s" :class="{ on: uiState.settings.textSpeed === s }" :data-test="`speed-${s}`" @click="setSpeed(s)">
                    {{ t(`ui.settings.${s}`) }}
                </button>
            </div>
        </div>
        <div v-if="fsSupported" class="row">
            <span>{{ t('ui.settings.fullscreen') }}</span>
            <div class="seg">
                <button :class="{ on: uiState.settings.fullscreen }" data-test="fullscreen" @click="toggleFullscreen">
                    {{ uiState.settings.fullscreen ? t('ui.on') : t('ui.off') }}
                </button>
            </div>
        </div>
        <button class="big" data-test="settings-back" @click="emit('back')">{{ t('ui.back') }}</button>
    </div>
</template>

<style scoped>
.panel { display: flex; flex-direction: column; gap: 28px; align-items: stretch; min-width: 900px; padding: 48px 64px; background: rgba(20, 24, 48, .95); border: 4px solid #f3e3b5; border-radius: 24px; color: #fff; font: 32px sans-serif; pointer-events: auto; }
h2 { margin: 0 0 8px; text-align: center; font-size: 48px; color: #ffd75e; }
.row { display: flex; align-items: center; gap: 24px; }
.row > span { flex: 1; }
input[type=range] { width: 360px; height: 32px; }
b { width: 64px; text-align: right; }
.seg { display: flex; gap: 8px; }
.seg button, .big { font: 30px sans-serif; padding: 10px 24px; border-radius: 12px; border: 3px solid #f3e3b5; background: #2d3a7a; color: #fff; cursor: pointer; }
.seg button.on { background: #ffd75e; color: #1d2240; }
.big { align-self: center; margin-top: 12px; min-width: 320px; }
</style>
