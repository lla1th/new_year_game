<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import type { Game } from 'phaser';
import StartGame from './game/PhaserGame';

let game: Game | null = null;

onMounted(() => {
    game = StartGame('game-container');
});

onUnmounted(() => {
    game?.destroy(true);
    game = null;
});
</script>

<template>
    <div id="game-container"></div>
</template>
