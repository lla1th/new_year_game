<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import type { Game } from 'phaser';
import StartGame from './game/PhaserGame';
import { attachGame } from './game/controller';

let game: Game | null = null;
const emit = defineEmits<{ ready: [] }>();

onMounted(() => {
    game = StartGame('game-container');
    attachGame(game);
    emit('ready');   // the game and its AudioManager exist now
});

onUnmounted(() => {
    attachGame(null);
    game?.destroy(true);
    game = null;
});
</script>

<template>
    <div id="game-container"></div>
</template>
