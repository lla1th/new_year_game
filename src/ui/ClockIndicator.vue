<script setup lang="ts">
import { computed } from 'vue';
import { gameState } from '../state/gameState';
import type { PartId } from '../game/data/types';

const SOCKETS: PartId[] = ['PART_SPRING', 'PART_GEAR', 'PART_HANDS'];
const filled = computed(() => SOCKETS.map(p => gameState.parts.includes(p)));
const count = computed(() => filled.value.filter(Boolean).length);
</script>

<template>
    <div class="clock" data-test="clock">
        <div v-for="(f, i) in filled" :key="SOCKETS[i]" class="socket" :class="{ filled: f }" :data-part="SOCKETS[i]">
            <span v-if="f">✦</span>
        </div>
        <div class="count">{{ count }}/3</div>
    </div>
</template>

<style scoped>
.clock { position: absolute; left: 24px; top: 24px; display: flex; gap: 12px; align-items: center; pointer-events: auto; }
.socket { width: 72px; height: 72px; border-radius: 50%; border: 4px solid #f3e3b5; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; color: #ffd75e; font-size: 40px; transition: transform .3s; }
.socket.filled { background: rgba(255,215,94,.25); transform: scale(1.08); }
.count { color: #fff; font: bold 32px sans-serif; text-shadow: 0 2px 4px #000; margin-left: 8px; }
</style>
