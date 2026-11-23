<script setup lang="ts">
import { computed } from 'vue';
import { getGameData } from '../game/data/gameData';
import type { SpeakerId } from '../game/data/types';

/** Credits: «Сделано с любовью для Ксюши» and the cast (names from characters.json); ≈30 s, a click skips. */
const emit = defineEmits<{ done: [] }>();
const data = getGameData()!;
const CAST: SpeakerId[] = ['ksyusha', 'spitz', 'cat', 'snail', 'nika', 'lekha', 'owl', 'snowman', 'ginger'];
const names = computed(() => CAST.map(id => data.characters.names[id]));
</script>

<template>
    <div class="credits" data-test="credits" @click="emit('done')">
        <div class="roll" @animationend="emit('done')">
            <h1>{{ data.texts.t('credits.title') }}</h1>
            <h2>{{ data.texts.t('credits.cast') }}</h2>
            <p v-for="n in names" :key="n" class="name">{{ n }} 👋</p>
            <p class="end">{{ data.texts.t('ui.title') }}</p>
        </div>
    </div>
</template>

<style scoped>
.credits { position: absolute; inset: 0; overflow: hidden; background: #0b1030; color: #fff; pointer-events: auto; cursor: pointer; }
.roll { position: absolute; left: 0; right: 0; top: 100%; text-align: center; animation: roll 30s linear forwards; }
@keyframes roll { to { transform: translateY(calc(-100% - 1100px)); } }
h1 { font: bold 84px sans-serif; color: #ffd75e; margin: 0 0 120px; }
h2 { font: 48px sans-serif; color: #f3e3b5; margin: 0 0 40px; }
.name { font: 44px sans-serif; margin: 28px 0; }
.end { font: bold 64px sans-serif; color: #ffd75e; margin-top: 200px; }
</style>
