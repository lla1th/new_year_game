<script setup lang="ts">
import { computed, ref } from 'vue';
import { getGameData } from '../game/data/gameData';
import type { LevelId } from '../game/data/types';
import { loadGame } from '../state/SaveService';
import SettingsPanel from './SettingsPanel.vue';

const emit = defineEmits<{ start: []; continue: []; level: [id: LevelId] }>();
const t = (k: string) => getGameData()!.texts.t(k);
const LEVEL_IDS: LevelId[] = ['L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08'];

const save = ref(loadGame());
const view = ref<'main' | 'confirm' | 'levels' | 'settings'>('main');
const flakes = Array.from({ length: 60 }, (_, i) => ({
    left: `${(i * 37) % 100}%`, delay: `${-(i * 0.73) % 10}s`, duration: `${7 + (i % 5) * 1.5}s`, size: `${6 + (i % 4) * 3}px`,
}));
const canContinue = computed(() => save.value !== null);
const canSelect = computed(() => save.value?.completed === true);

function onStart () {
    if (save.value) view.value = 'confirm';
    else emit('start');
}
</script>

<template>
    <div class="menu" data-test="main-menu">
        <div class="snow"><i v-for="(f, i) in flakes" :key="i" :style="{ left: f.left, animationDelay: f.delay, animationDuration: f.duration, width: f.size, height: f.size }" /></div>
        <div class="window" />
        <h1>{{ t('ui.title') }}</h1>
        <div v-if="view === 'main'" class="buttons">
            <button data-test="menu-start" @click="onStart">{{ t('ui.menu.start') }}</button>
            <button v-if="canContinue" data-test="menu-continue" @click="emit('continue')">{{ t('ui.menu.continue') }}</button>
            <button v-if="canSelect" data-test="menu-levels" @click="view = 'levels'">{{ t('ui.menu.levelSelect') }}</button>
            <button data-test="menu-settings" @click="view = 'settings'">{{ t('ui.menu.settings') }}</button>
        </div>
        <div v-else-if="view === 'confirm'" class="buttons">
            <p>{{ t('ui.menu.confirmRestart') }}</p>
            <button data-test="confirm-yes" @click="emit('start')">{{ t('ui.yes') }}</button>
            <button data-test="confirm-no" @click="view = 'main'">{{ t('ui.no') }}</button>
        </div>
        <div v-else-if="view === 'levels'" class="buttons levels">
            <button v-for="id in LEVEL_IDS" :key="id" :data-test="`level-${id}`" @click="emit('level', id)">{{ id }} · {{ t(`ui.level.${id}`) }}</button>
            <button @click="view = 'main'">{{ t('ui.back') }}</button>
        </div>
        <SettingsPanel v-else @back="view = 'main'" />
    </div>
</template>

<style scoped>
.menu { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 48px; background: linear-gradient(#0b1030, #1d2a5a); color: #fff; pointer-events: auto; overflow: hidden; font-family: sans-serif; }
.window { position: absolute; left: 50%; top: 50%; width: 1100px; height: 760px; transform: translate(-50%, -50%); border: 24px solid #5b3a24; border-radius: 12px; box-shadow: inset 0 0 0 8px #3e2717; pointer-events: none; }
.snow i { position: absolute; top: -20px; border-radius: 50%; background: #fff; opacity: .85; animation: fall linear infinite; }
@keyframes fall { to { transform: translateY(1120px); } }
h1 { position: relative; margin: 0; font-size: 96px; color: #ffd75e; text-shadow: 0 6px 0 #7a3b12, 0 0 24px rgba(255, 215, 94, .5); }
.buttons { position: relative; display: flex; flex-direction: column; gap: 20px; align-items: center; }
.buttons p { font-size: 40px; margin: 0 0 12px; }
.levels { display: grid; grid-template-columns: 1fr 1fr; }
button { min-width: 440px; font: bold 40px sans-serif; padding: 16px 32px; border-radius: 16px; border: 4px solid #f3e3b5; background: rgba(45, 58, 122, .9); color: #fff; cursor: pointer; }
button:hover { background: #ffd75e; color: #1d2240; }
</style>
