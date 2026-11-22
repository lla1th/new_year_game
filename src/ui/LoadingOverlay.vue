<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { bus } from '../events';

/** Loading screen (UI_UX: snowflake + percent); shown only if loading takes longer than 0.3 s. */
const SHOW_AFTER_MS = 300;
const progress = ref<number | null>(null);
const visible = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

let off: (() => void) | null = null;
onMounted(() => {
    off = bus.on('loading', ({ progress: p }) => {
        progress.value = p;
        if (p === null) {
            if (timer) clearTimeout(timer);
            timer = null;
            visible.value = false;
        } else if (!visible.value && !timer) {
            timer = setTimeout(() => { timer = null; if (progress.value !== null) visible.value = true; }, SHOW_AFTER_MS);
        }
    });
});
onUnmounted(() => { off?.(); if (timer) clearTimeout(timer); });
</script>

<template>
    <div v-if="visible" class="loading" data-test="loading">
        <div class="flake">❄</div>
        <div class="pct" data-test="loading-pct">{{ Math.round((progress ?? 0) * 100) }}%</div>
    </div>
</template>

<style scoped>
.loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; background: #0b1030; color: #cfefff; pointer-events: auto; z-index: 30; }
.flake { font-size: 160px; animation: spin 3s linear infinite; }
.pct { font: bold 64px sans-serif; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
