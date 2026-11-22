<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { getAudio } from './game/audio/AudioManager';
import { bus } from './events';
import { loadData } from './game/data/loadData';
import { getGameData, setGameData } from './game/data/gameData';
import { GAME_HEIGHT, GAME_WIDTH, type CursorKind, type ItemId, type LevelId } from './game/data/types';
import { setPaused, startLevel, stopLevel } from './game/controller';
import { isDebug } from './game/debug';
import { gameState } from './state/gameState';
import { loadGame } from './state/SaveService';
import { startScreen } from './game/levels';
import { startStateFor } from './game/levels/startState';
import { PUZZLES_WITH_ITEMS } from './puzzles/itemPuzzles';
import PhaserGame from './PhaserGame.vue';
import Credits from './ui/Credits.vue';
import DebugPanel from './ui/DebugPanel.vue';
import EndingCard from './ui/EndingCard.vue';
import DialogBox from './ui/DialogBox.vue';
import Hud from './ui/Hud.vue';
import Inventory from './ui/Inventory.vue';
import MainMenu from './ui/MainMenu.vue';
import PauseMenu from './ui/PauseMenu.vue';
import { isFullscreen } from './ui/fullscreen';
import { useStageRect } from './ui/stage';
import { uiState } from './ui/uiState';

const CURSOR_FALLBACK: Record<CursorKind, string> = { default: 'default', hand: 'pointer', eye: 'zoom-in', gear: 'pointer', talk: 'pointer', exit: 'e-resize' };
/** 32×32 cursor pictures (ASSET_REQUIREMENTS §4); the browser falls back to the system cursor while a file is missing. */
const CURSORS = Object.fromEntries(Object.entries(CURSOR_FALLBACK).map(([k, v]) =>
    [k, `url(${import.meta.env.BASE_URL}assets/img/ui/cursor_${k}.png) 4 4, ${v}`])) as Record<CursorKind, string>;
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
    const completed = loadGame()?.completed ?? false;   // the level select stays open after the game was completed once
    gameState.reset();
    gameState.completed = completed;
    play('L01');
}

function continueGame () {
    const save = loadGame();
    if (!save) { menuKey.value++; return; }
    gameState.loadFrom(save);   // an unfinished puzzle starts over: puzzle state is not saved
    play(save.levelId, startScreen(save.levelId, save.screenId));
}

function selectLevel (id: LevelId) {
    const start = startStateFor(id);   // only the items this level needs and the parts of the levels before it
    gameState.reset();
    gameState.completed = true;
    gameState.inventory = start.inventory;
    gameState.parts = start.parts;
    gameState.flags = start.flags;
    play(id);
}

function endingNext () {
    uiState.ending = 'credits';
    bus.emit('ending:credits');
}

function creditsDone () {
    if (uiState.ending !== 'credits') return;
    uiState.ending = null;
    bus.emit('ending:post');
}

function pause (on: boolean) {
    if (uiState.screen !== 'game' || uiState.ending) return;   // no pause over the card / credits
    uiState.paused = on;
    setPaused(on);
    getAudio()?.setPaused(on);   // music at 30 %
}

// --- audio: unlock on the first interaction, settings, menu music, UI sounds ---------------------------
function unlockAudio () {
    getAudio()?.unlock();
}
watch(() => ({ ...uiState.settings }), s => getAudio()?.applySettings(s), { deep: true });
function menuAudio () {
    const a = getAudio();
    if (!a) return;
    a.applySettings(uiState.settings);
    if (uiState.screen === 'menu') { a.playMusic('mus_menu'); a.playAmbient(null); a.setPaused(false); }
}
watch(() => uiState.screen, menuAudio);
watch(() => gameState.inventory.length, (n, o) => { if (n > o) getAudio()?.playSfx('sfx_pickup'); });
watch(() => gameState.parts.length, (n, o) => { if (n > o) getAudio()?.playSfx('sfx_part'); });
function onUiClick (e: MouseEvent) {
    if ((e.target as HTMLElement | null)?.closest('button')) getAudio()?.playSfx('sfx_click');
}

function toMenu () {
    stopLevel();
    getAudio()?.setPaused(false);
    uiState.ending = null;
    uiState.puzzleTakesItems = false;
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
        bus.on('puzzle:open', ({ puzzleId }) => {
            uiState.puzzleOpen = true;
            uiState.puzzleTakesItems = PUZZLES_WITH_ITEMS.includes(puzzleId);
            uiState.cursor = 'default';
        }),
        bus.on('puzzle:close', () => { uiState.puzzleOpen = false; uiState.puzzleTakesItems = false; }),
        bus.on('ending:card', () => { uiState.ending = 'card'; }),
        bus.on('ending:done', () => toMenu()),
        bus.on('checkpoint', () => {
            uiState.checkpointVisible = true;
            if (checkpointTimer) clearTimeout(checkpointTimer);
            checkpointTimer = setTimeout(() => { uiState.checkpointVisible = false; }, CHECKPOINT_ICON_MS);
        }),
    );
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', unlockAudio, { capture: true });
    window.addEventListener('keydown', unlockAudio, { capture: true });
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
    window.removeEventListener('pointerdown', unlockAudio, { capture: true });
    window.removeEventListener('keydown', unlockAudio, { capture: true });
    document.removeEventListener('fullscreenchange', onFsChange);
});
</script>

<template>
    <div class="root" :style="{ cursor: uiState.screen === 'game' ? uiState.cursor : 'default' }">
        <PhaserGame v-if="uiState.screen === 'menu' || uiState.screen === 'game'" @ready="menuAudio" />
        <div v-if="uiState.screen === 'loading'" class="msg">…</div>
        <div v-if="uiState.screen === 'error'" class="msg">Load error. Please reload the page.</div>
        <!--
            Phaser listens to mousedown/touchstart on window and treats clicks on DOM UI as clicks on the game.
            Stopping propagation here keeps clicks on Vue UI (dialog, HUD, inventory, menus) away from the scene.
        -->
        <div
            v-if="uiState.screen === 'menu' || uiState.screen === 'game'" class="stage" :style="stageStyle"
            @mousedown.stop @touchstart.stop @click="onUiClick"
        >
            <template v-if="uiState.screen === 'game'">
                <Hud v-show="!uiState.ending" @pause="pause(true)" />
                <!-- Hidden on overlay screens that take no items. -->
                <div v-show="!uiState.ending && (!uiState.puzzleOpen || uiState.puzzleTakesItems)" class="layer"><Inventory @inspect="inspectItem" /></div>
                <DialogBox ref="dialogBox" />
                <DebugPanel v-if="debug" />
                <EndingCard v-if="uiState.ending === 'card'" @next="endingNext" />
                <Credits v-if="uiState.ending === 'credits'" @done="creditsDone" />
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
