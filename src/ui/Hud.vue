<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { bus } from '../events';
import { getGameData } from '../game/data/gameData';
import { gameState } from '../state/gameState';
import { uiState } from './uiState';
import ClockIndicator from './ClockIndicator.vue';

const emit = defineEmits<{ pause: [] }>();
const t = (k: string) => getGameData()!.texts.t(k);
const spitzVisible = computed(() => gameState.hasFlag('L01_SPITZ_FREED'));

function hint () {
    if (uiState.dialogActive || uiState.paused || uiState.puzzleOpen) return;   // ignored during a dialog
    bus.emit('hint:request');
}
function highlight () {
    if (uiState.dialogActive || uiState.paused) return;
    bus.emit('highlight:all');
}
function onKey (e: KeyboardEvent) {
    if (uiState.screen !== 'game' || uiState.paused) return;
    if (e.code === 'Space' && !uiState.dialogActive) { e.preventDefault(); highlight(); }
}
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
    <div class="hud">
        <ClockIndicator />
        <div class="buttons">
            <button v-if="spitzVisible" class="btn" data-test="hint" :title="t('ui.hint')" @click="hint">🐕</button>
            <button class="btn" data-test="highlight" :title="t('ui.highlight')" @click="highlight">🔍</button>
            <button class="btn" data-test="pause" :title="t('ui.pause')" @click="emit('pause')">⚙</button>
        </div>
        <div v-if="uiState.checkpointVisible" class="checkpoint" data-test="checkpoint">❄</div>
    </div>
</template>

<style scoped>
.hud { position: absolute; inset: 0; pointer-events: none; }
.buttons { position: absolute; right: 24px; top: 24px; display: flex; gap: 16px; pointer-events: auto; }
.btn { width: 96px; height: 96px; font-size: 52px; border-radius: 20px; border: 4px solid #f3e3b5; background: rgba(20, 24, 48, .8); color: #fff; cursor: pointer; padding: 0; }
.btn:hover { background: rgba(60, 70, 130, .9); }
.checkpoint { position: absolute; right: 32px; bottom: 32px; font-size: 64px; color: #cfefff; text-shadow: 0 0 12px #9cf; animation: spin 1.5s linear; }
@keyframes spin { from { transform: rotate(0deg); opacity: 0; } 20% { opacity: 1; } to { transform: rotate(180deg); opacity: 1; } }
</style>
