<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { bus } from './events';
import { loadData } from './game/data/loadData';
import { getGameData, setGameData } from './game/data/gameData';
import type { CursorKind, ItemId } from './game/data/types';
import { GAME_HEIGHT, GAME_WIDTH } from './game/data/types';
import PhaserGame from './PhaserGame.vue';
import DialogBox from './ui/DialogBox.vue';
import Hud from './ui/Hud.vue';
import Inventory from './ui/Inventory.vue';
import { useStageRect } from './ui/stage';
import { uiState } from './ui/uiState';

const CURSORS: Record<CursorKind, string> = { default: 'default', hand: 'pointer', eye: 'zoom-in', gear: 'pointer', talk: 'pointer', exit: 'e-resize' };

const stage = useStageRect();
const dialogBox = ref<InstanceType<typeof DialogBox> | null>(null);
const stageStyle = computed(() => ({
    left: `${stage.left}px`, top: `${stage.top}px`, width: `${GAME_WIDTH}px`, height: `${GAME_HEIGHT}px`,
    transform: `scale(${stage.scale})`,
}));

function inspectItem (id: ItemId) {
    const def = getGameData()?.items[id];
    if (def) dialogBox.value?.sayLocal('ksyusha', def.inspectKey);
}

const offs: (() => void)[] = [];
onMounted(async () => {
    offs.push(bus.on('cursor', ({ kind }) => { uiState.cursor = CURSORS[kind] ?? 'default'; }));
    try {
        setGameData(await loadData());
        uiState.screen = 'game';
    } catch (e) {
        console.error(e);
        uiState.screen = 'error';
    }
});
onUnmounted(() => offs.forEach(off => off()));
</script>

<template>
    <div class="root" :style="{ cursor: uiState.cursor }">
        <PhaserGame v-if="uiState.screen === 'game'" />
        <div v-if="uiState.screen === 'loading'" class="msg">…</div>
        <div v-if="uiState.screen === 'error'" class="msg">Load error</div>
        <div v-if="uiState.screen === 'game'" class="stage" :style="stageStyle">
            <Hud @pause="uiState.paused = !uiState.paused" />
            <Inventory @inspect="inspectItem" />
            <DialogBox ref="dialogBox" />
        </div>
    </div>
</template>

<style scoped>
.root { position: relative; width: 100%; height: 100%; }
.stage { position: absolute; transform-origin: 0 0; pointer-events: none; overflow: hidden; font-family: sans-serif; user-select: none; }
.msg { color: #fff; font: 24px sans-serif; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
</style>
