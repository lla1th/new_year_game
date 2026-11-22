<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { bus } from '../events';
import { getGameData } from '../game/data/gameData';
import { LEVEL_STYLE, type SpeakerId } from '../game/data/types';
import type { DialogChoice } from '../game/data/schemas';
import { gameState } from '../state/gameState';
import { DialogQueue } from './dialogQueue';
import { getAudio } from '../game/audio/AudioManager';
import { isHihik } from '../game/scenes/LevelScene';
import { charsVisible } from './typewriter';
import { uiState } from './uiState';
import Placeholder from './Placeholder.vue';

const data = getGameData()!;
const q = reactive(new DialogQueue());
const startedAt = ref(0);
const now = ref(0);
const revealed = ref(false);
let raf = 0;

const line = computed(() => q.line);
const fullText = computed(() => (line.value ? data.texts.t(line.value.key) : ''));
const shown = computed(() => {
    if (!line.value) return '';
    if (revealed.value) return fullText.value;
    return fullText.value.slice(0, charsVisible(now.value - startedAt.value, uiState.settings.textSpeed, fullText.value.length));
});
const done = computed(() => shown.value.length >= fullText.value.length);
const choices = computed(() => (done.value && line.value?.choices?.length ? line.value.choices.slice(0, 3) : []));
const name = computed(() => (line.value ? data.characters.names[line.value.speaker] : ''));
const portrait = computed(() => {
    if (!line.value) return undefined;
    const p = data.characters.portraits[line.value.speaker]?.[LEVEL_STYLE[gameState.levelId]];
    return p ? `${import.meta.env.BASE_URL}assets/${p}` : undefined;
});

function tick () {
    now.value = performance.now();
    raf = requestAnimationFrame(tick);
}

// Every new line starts printing from zero; the rAF ticker runs only while something is shown.
watch(() => [q.job, q.index] as const, () => {
    startedAt.value = performance.now();
    now.value = startedAt.value;
    revealed.value = false;
    uiState.dialogActive = q.active;
    if (q.active && !raf) raf = requestAnimationFrame(tick);
    if (!q.active && raf) { cancelAnimationFrame(raf); raf = 0; }
});

// a quiet tick every 3 printed characters; the sparkle with «Хихик»
watch(() => shown.value.length, (n, o) => {
    if (n > o && Math.floor(n / 3) > Math.floor(o / 3) && n < fullText.value.length) getAudio()?.playSfx('sfx_typing');
});
watch(() => line.value, l => { if (l && isHihik(fullText.value)) getAudio()?.playSfx('sfx_hihik'); });

function onClick () {
    if (!line.value) return;
    if (!done.value) { revealed.value = true; return; }
    if (choices.value.length) return;   // must pick a choice
    q.advance();
}

function choose (c: DialogChoice) {
    q.choose(c);
}

function onKey (e: KeyboardEvent) {
    if (!q.active || uiState.paused) return;
    if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); onClick(); }
}

const offs: (() => void)[] = [];
onMounted(() => {
    offs.push(
        bus.on('say', ({ speaker, textKey }) => q.enqueue({ lines: [{ speaker, key: textKey }], onDone: () => bus.emit('say:done') })),
        bus.on('dialog:start', ({ dialogId }) => {
            const lines = (data.dialogs[dialogId] ?? []).map(l => ({ ...l, choices: l.choices ? [...l.choices] : undefined }));
            if (lines.length === 0) console.warn(`[DialogBox] unknown or empty dialog "${dialogId}"`);
            q.enqueue({ lines, onDone: () => bus.emit('dialog:end', { dialogId }) });
        }),
    );
    window.addEventListener('keydown', onKey);
});
onUnmounted(() => {
    for (const off of offs) off();
    window.removeEventListener('keydown', onKey);
    if (raf) cancelAnimationFrame(raf);
    uiState.dialogActive = false;
});

/** Shows a single line not requested by Phaser (e.g. inspecting an inventory item). */
function sayLocal (speaker: SpeakerId, key: string) {
    q.enqueue({ lines: [{ speaker, key }], onDone: () => {} });
}
defineExpose({ sayLocal });
</script>

<template>
    <div v-if="line" class="catcher" data-test="dialog" @click="onClick" @contextmenu.prevent>
        <div class="box">
            <div class="portrait"><Placeholder :src="portrait" :color-key="`portrait_${line.speaker}`" :label="name" /></div>
            <div class="body">
                <div class="name">{{ name }}</div>
                <div class="text" data-test="dialog-text">{{ shown }}</div>
                <div v-if="choices.length" class="choices">
                    <button v-for="c in choices" :key="c.key" class="choice" @click.stop="choose(c)">{{ data.texts.t(c.key) }}</button>
                </div>
            </div>
            <div v-if="done && !choices.length" class="next">▼</div>
        </div>
    </div>
</template>

<style scoped>
.catcher { position: absolute; inset: 0; pointer-events: auto; cursor: pointer; }
.box { position: absolute; left: 260px; bottom: 168px; width: 1400px; height: 220px; box-sizing: border-box; display: flex; gap: 24px; padding: 20px 28px; background: rgba(20, 24, 48, .92); border: 4px solid #f3e3b5; border-radius: 16px; color: #fff; }
.portrait { width: 176px; height: 176px; flex: none; border-radius: 12px; overflow: hidden; }
.body { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.name { font: bold 30px sans-serif; color: #ffd75e; margin-bottom: 6px; }
.text { font: 30px/1.3 sans-serif; white-space: pre-wrap; }
.choices { display: flex; gap: 16px; margin-top: auto; }
.choice { font: 28px sans-serif; padding: 8px 20px; min-height: var(--min-touch, 0px); background: #2d3a7a; color: #fff; border: 3px solid #f3e3b5; border-radius: 10px; cursor: pointer; }
.next { position: absolute; right: 24px; bottom: 12px; font-size: 32px; color: #ffd75e; animation: blink 1s infinite; }
@keyframes blink { 50% { opacity: 0; } }
</style>
