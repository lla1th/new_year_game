<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { getGameData } from '../game/data/gameData';

/**
 * Phones are played in landscape only (UI_UX §6): in portrait on a touch device a full-screen "turn your phone"
 * screen covers everything and the game pauses; turning back continues from the same place.
 */
const emit = defineEmits<{ change: [portrait: boolean] }>();
const portrait = ref(false);
const t = (k: string) => getGameData()?.texts.t(k) ?? '';
let mqPortrait: MediaQueryList | null = null;
let mqTouch: MediaQueryList | null = null;

function check () {
    portrait.value = !!mqPortrait?.matches && !!mqTouch?.matches;
}
onMounted(() => {
    mqPortrait = window.matchMedia('(orientation: portrait)');
    mqTouch = window.matchMedia('(pointer: coarse)');
    mqPortrait.addEventListener('change', check);
    mqTouch.addEventListener('change', check);
    check();
});
onUnmounted(() => {
    mqPortrait?.removeEventListener('change', check);
    mqTouch?.removeEventListener('change', check);
});
watch(portrait, v => emit('change', v));
</script>

<template>
    <div v-if="portrait" class="rotate" data-test="rotate" @pointerdown.stop.prevent @touchstart.stop.prevent>
        <div class="phone" />
        <p>{{ t('ui.rotate') }}</p>
    </div>
</template>

<style scoped>
.rotate { position: fixed; inset: 0; z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32px; background: #0b1030; color: #fff; font: bold 26px sans-serif; text-align: center; padding: 24px; }
.phone { width: 70px; height: 120px; border: 6px solid #ffd75e; border-radius: 14px; animation: turn 2s ease-in-out infinite; }
@keyframes turn { 0%, 30% { transform: rotate(0deg); } 60%, 100% { transform: rotate(-90deg); } }
</style>
