<script setup lang="ts">
import { getGameData } from '../game/data/gameData';
import { bus } from '../events';

const t = (k: string) => getGameData()!.texts.t(k);
const pick = (option: 1 | 2 | 3) => bus.emit('name:pick', { option });
</script>

<template>
    <div class="name" data-test="name-choice">
        <div class="box">
            <h2>{{ t('name.title') }}</h2>
            <button data-test="name-1" @click="pick(1)">{{ t('name.option.1') }}</button>
            <button data-test="name-2" @click="pick(2)">{{ t('name.option.2') }}</button>
            <!-- «Марат» недоступен: серая, но кликабельная — шпиц отвечает репликой автора -->
            <button class="locked" data-test="name-3" @click="pick(3)">{{ t('name.option.3') }}</button>
        </div>
    </div>
</template>

<style scoped>
.name { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, .6); pointer-events: auto; }
.box { display: flex; flex-direction: column; gap: 24px; align-items: center; padding: 48px 80px; background: rgba(20, 24, 48, .95); border: 4px solid #f3e3b5; border-radius: 24px; }
h2 { margin: 0 0 8px; font: bold 56px sans-serif; color: #ffd75e; }
button { min-width: 440px; font: bold 40px sans-serif; padding: 16px 32px; border-radius: 16px; border: 4px solid #f3e3b5; background: #2d3a7a; color: #fff; cursor: pointer; }
button:hover { background: #ffd75e; color: #1d2240; }
button.locked { background: #555; border-color: #888; color: #aaa; }
button.locked:hover { background: #666; color: #ccc; }
</style>
