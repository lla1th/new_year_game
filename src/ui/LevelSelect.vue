<script setup lang="ts">
import { getGameData } from '../game/data/gameData';
import type { LevelId } from '../game/data/types';

/** Level select (main menu, after the game is completed). */
const emit = defineEmits<{ level: [id: LevelId]; back: [] }>();
const t = (k: string) => getGameData()!.texts.t(k);
const LEVEL_IDS: LevelId[] = ['L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08'];
</script>

<template>
    <div class="levels" data-test="level-select">
        <button v-for="id in LEVEL_IDS" :key="id" :data-test="`level-${id}`" @click="emit('level', id)">{{ id }} · {{ t(`ui.level.${id}`) }}</button>
        <button class="back" @click="emit('back')">{{ t('ui.back') }}</button>
    </div>
</template>

<style scoped>
.levels { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
button { min-width: 440px; font: bold 36px sans-serif; padding: 14px 28px; border-radius: 16px; border: 4px solid #f3e3b5; background: rgba(45, 58, 122, .9); color: #fff; cursor: pointer; }
button:hover { background: #ffd75e; color: #1d2240; }
.back { grid-column: 1 / -1; justify-self: center; }
</style>
