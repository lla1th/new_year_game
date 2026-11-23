<script setup lang="ts">
import { ref } from 'vue';
import { getGameData } from '../game/data/gameData';
import SettingsPanel from './SettingsPanel.vue';

const emit = defineEmits<{ resume: []; toMenu: [] }>();
const t = (k: string) => getGameData()!.texts.t(k);
const view = ref<'main' | 'settings'>('main');
</script>

<template>
    <div class="pause" data-test="pause-menu">
        <div v-if="view === 'main'" class="box">
            <h2>{{ t('ui.pause.title') }}</h2>
            <button data-test="pause-resume" @click="emit('resume')">{{ t('ui.pause.resume') }}</button>
            <button data-test="pause-settings" @click="view = 'settings'">{{ t('ui.pause.settings') }}</button>
            <button data-test="pause-menu-btn" @click="emit('toMenu')">{{ t('ui.pause.toMenu') }}</button>
        </div>
        <SettingsPanel v-else @back="view = 'main'" />
    </div>
</template>

<style scoped>
.pause { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, .6); pointer-events: auto; }
.box { display: flex; flex-direction: column; gap: 24px; align-items: center; padding: 48px 80px; background: rgba(20, 24, 48, .95); border: 4px solid #f3e3b5; border-radius: 24px; }
h2 { margin: 0 0 8px; font: bold 56px sans-serif; color: #ffd75e; }
button { min-width: 440px; font: bold 40px sans-serif; padding: 16px 32px; border-radius: 16px; border: 4px solid #f3e3b5; background: #2d3a7a; color: #fff; cursor: pointer; }
button:hover { background: #ffd75e; color: #1d2240; }
</style>
