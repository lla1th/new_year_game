<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { bus } from './events';
import { loadData } from './game/data/loadData';
import { getGameData, setGameData } from './game/data/gameData';
import { GAME_HEIGHT, GAME_WIDTH, type CursorKind, type ItemId, type LevelId } from './game/data/types';
import { setPaused, startLevel, stopLevel } from './game/controller';
import { isDebug } from './game/debug';
import { gameState } from './state/gameState';
import { loadGame } from './state/SaveService';
import PhaserGame from './PhaserGame.vue';
import DebugPanel from './ui/DebugPanel.vue';
import DialogBox from './ui/DialogBox.vue';
import Hud from './ui/Hud.vue';
import Inventory from './ui/Inventory.vue';
import MainMenu from './ui/MainMenu.vue';
import PauseMenu from './ui/PauseMenu.vue';
import { isFullscreen } from './ui/fullscreen';
import { useStageRect } from './ui/stage';
import { uiState } from './ui/uiState';

const CURSORS: Record<CursorKind, string> = { default: 'default', hand: 'pointer', eye: 'zoom-in', gear: 'pointer', talk: 'pointer', exit: 'e-resize' };
const CHECKPOINT_ICON_MS = 1500;

const stage = useStageRect();
const debug = isDebug();
const dialogBox = ref<InstanceType<typeof DialogBox> | null>(null);
const menuKey = ref(0);
const stageStyle = computed(() => ({
    left: `${stage.left}px`, top: `${stage.top}px`, width: `${GAME_WIDTH}px`, height: `${GAME_HEIGHT}px`,
    transform: `scale(${stage.scale})`,
}));

function inspectItem (id: ItemId) {
    const def = getGameData()?.items[id];
    if (def) dialogBox.value?.sayLocal('ksyusha', def.inspectKey);
}

function play (level: LevelId, screen?: string | null) {
    uiState.paused = false;
    uiState.dialogActive = false;
    uiState.puzzleOpen = false;
    uiState.screen = 'game';
    startLevel(level, screen);
}

function newGame () {
    gameState.reset();
    play('L01');
}

function continueGame () {
    const save = loadGame();
    if (!save) { menuKey.value++; return; }
    gameState.loadFrom(save);   // an unfinished puzzle starts over: puzzle state is not saved
    play(save.levelId, save.screenId);
}

function selectLevel (id: LevelId) {
    const completed = loadGame()?.completed ?? false;
    gameState.reset();
    gameState.completed = completed;
    play(id);
}

function pause (on: boolean) {
    if (uiState.screen !== 'game') return;
    uiState.paused = on;
    setPaused(on);
}

function toMenu () {
    stopLevel();
    uiState.paused = false;
    uiState.dialogActive = false;
    uiState.puzzleOpen = false;
    uiState.screen = 'menu';
    menuKey.value++;   // re-read the save for "Continue"
}

function onKey (e: KeyboardEvent) {
    if (e.code === 'Escape' && uiState.screen === 'game') pause(!uiState.paused);
}

let checkpointTimer: ReturnType<typeof setTimeout> | null = null;
const offs: (() => void)[] = [];
const onFsChange = () => { uiState.settings.fullscreen = isFullscreen(); };

onMounted(async () => {
    offs.push(
        bus.on('cursor', ({ kind }) => { uiState.cursor = CURSORS[kind] ?? 'default'; }),
        bus.on('puzzle:open', () => { uiState.puzzleOpen = true; uiState.cursor = 'default'; }),
        bus.on('puzzle:close', () => { uiState.puzzleOpen = false; }),
        bus.on('checkpoint', () => {
            uiState.checkpointVisible = true;
            if (checkpointTimer) clearTimeout(checkpointTimer);
            checkpointTimer = setTimeout(() => { uiState.checkpointVisible = false; }, CHECKPOINT_ICON_MS);
        }),
    );
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFsChange);
    try {
        setGameData(await loadData());
        uiState.screen = 'menu';
    } catch (e) {
        console.error(e);
        uiState.screen = 'error';
    }
});
onUnmounted(() => {
    offs.forEach(off => off());
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('fullscreenchange', onFsChange);
});
</script>

<template>
    <div class="root" :style="{ cursor: uiState.screen === 'game' ? uiState.cursor : 'default' }">
        <PhaserGame v-if="uiState.screen === 'menu' || uiState.screen === 'game'" />
        <div v-if="uiState.screen === 'loading'" class="msg">…</div>
        <div v-if="uiState.screen === 'error'" class="msg">Load error. Please reload the page.</div>
        <div v-if="uiState.screen === 'menu' || uiState.screen === 'game'" class="stage" :style="stageStyle">
            <template v-if="uiState.screen === 'game'">
                <Hud @pause="pause(true)" />
                <!-- Hidden on overlay screens that take no items (P-02 will opt in, M2). -->
                <div v-show="!uiState.puzzleOpen" class="layer"><Inventory @inspect="inspectItem" /></div>
                <DialogBox ref="dialogBox" />
                <DebugPanel v-if="debug" />
                <PauseMenu v-if="uiState.paused" @resume="pause(false)" @to-menu="toMenu" />
            </template>
            <MainMenu v-else :key="menuKey" @start="newGame" @continue="continueGame" @level="selectLevel" />
        </div>
    </div>
</template>

<style scoped>
.root { position: relative; width: 100%; height: 100%; }
.stage { position: absolute; transform-origin: 0 0; pointer-events: none; overflow: hidden; font-family: sans-serif; user-select: none; }
.layer { position: absolute; inset: 0; pointer-events: none; }
.msg { color: #fff; font: 24px sans-serif; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
</style>
