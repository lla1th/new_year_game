<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { getGameData } from '../game/data/gameData';
import { CARD_CPS, charsVisibleCps } from './typewriter';

/** The ending card: the author's greeting (ru.json l08.card.text) prints slowly, then the gift line. */
const emit = defineEmits<{ next: [] }>();
const t = (k: string) => getGameData()!.texts.t(k);
const text = t('l08.card.text');
const gift = t('l08.card.gift');
const start = performance.now();
const now = ref(start);
let raf = requestAnimationFrame(function tick () { now.value = performance.now(); raf = requestAnimationFrame(tick); });
onUnmounted(() => cancelAnimationFrame(raf));
const skip = ref(false);
const shown = computed(() => (skip.value ? text : text.slice(0, charsVisibleCps(now.value - start, CARD_CPS, text.length))));
const done = computed(() => shown.value.length >= text.length);
</script>

<template>
    <div class="ending" data-test="ending-card" @click="skip = true">
        <div class="card">
            <div class="text">{{ shown }}</div>
            <div v-if="done" class="gift" data-test="ending-gift">{{ gift }}</div>
            <button v-if="done" class="next" data-test="ending-next" @click.stop="emit('next')">{{ t('ui.next') }}</button>
        </div>
    </div>
</template>

<style scoped>
.ending { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(10, 12, 40, .85); pointer-events: auto; }
.card { width: 1100px; min-height: 600px; box-sizing: border-box; padding: 64px 80px; background: #fffaf0; border: 12px solid #c62828; border-radius: 24px; box-shadow: 0 0 60px rgba(255, 215, 94, .6); display: flex; flex-direction: column; gap: 40px; color: #3e2723; }
.text { font: 40px/1.4 Georgia, serif; white-space: pre-wrap; min-height: 300px; }
.gift { font: italic bold 40px Georgia, serif; color: #c62828; }
.next { align-self: flex-end; font: bold 36px sans-serif; padding: 14px 40px; border-radius: 16px; border: 4px solid #c62828; background: #ffd75e; cursor: pointer; }
</style>
