<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { bus } from '../events';
import { getGameData } from '../game/data/gameData';
import { LEVEL_STYLE, type SpeakerId } from '../game/data/types';
import type { DialogChoice } from '../game/data/schemas';
import { gameState } from '../state/gameState';
import { charsVisible } from './typewriter';
import { uiState } from './uiState';
import Placeholder from './Placeholder.vue';

interface Line { speaker: SpeakerId; key: string; choices?: DialogChoice[] }
interface Job { lines: Line[]; onDone: () => void }

const data = getGameData()!;
const jobs: Job[] = [];
const job = ref<Job | null>(null);
const index = ref(0);
const startedAt = ref(0);
const now = ref(0);
const revealed = ref(false);
let raf = 0;

const line = computed<Line | null>(() => (job.value ? job.value.lines[index.value] ?? null : null));
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

function startLine () {
    startedAt.value = performance.now();
    now.value = startedAt.value;
    revealed.value = false;
}

function enqueue (j: Job) {
    jobs.push(j);
    if (!job.value) nextJob();
}

function nextJob () {
    const j = jobs.shift() ?? null;
    job.value = j;
    index.value = 0;
    uiState.dialogActive = j !== null;
    if (j) {
        startLine();
        if (!raf) raf = requestAnimationFrame(tick);
    } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
    }
}

function advance () {
    const j = job.value;
    if (!j) return;
    if (index.value + 1 < j.lines.length) {
        index.value++;
        startLine();
        return;
    }
    nextJob();
    j.onDone();
}

function onClick () {
    if (!line.value) return;
    if (!done.value) { revealed.value = true; return; }
    if (choices.value.length) return;   // must pick a choice
    advance();
}

function choose (c: DialogChoice) {
    const j = job.value;
    if (!j) return;
    // Ksyusha says the chosen line, then the optional reply, then the dialog continues as usual.
    const extra: Line[] = [{ speaker: 'ksyusha', key: c.key }];
    if (c.reply) extra.push({ speaker: c.reply.speaker, key: c.reply.key });
    j.lines.splice(index.value + 1, 0, ...extra);
    j.lines[index.value] = { ...j.lines[index.value], choices: undefined };
    advance();
}

function onKey (e: KeyboardEvent) {
    if (!job.value || uiState.paused) return;
    if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); onClick(); }
}

const offs: (() => void)[] = [];
onMounted(() => {
    offs.push(
        bus.on('say', ({ speaker, textKey }) => enqueue({ lines: [{ speaker, key: textKey }], onDone: () => bus.emit('say:done') })),
        bus.on('dialog:start', ({ dialogId }) => {
            const lines = (data.dialogs[dialogId] ?? []).map(l => ({ ...l, choices: l.choices ? [...l.choices] : undefined }));
            if (lines.length === 0) console.warn(`[DialogBox] unknown or empty dialog "${dialogId}"`);
            enqueue({ lines, onDone: () => bus.emit('dialog:end', { dialogId }) });
            if (lines.length === 0) { nextJob(); bus.emit('dialog:end', { dialogId }); }
        }),
    );
    window.addEventListener('keydown', onKey);
});
onUnmounted(() => {
    for (const off of offs) off();
    window.removeEventListener('keydown', onKey);
    if (raf) cancelAnimationFrame(raf);
});

/** Shows a single line not requested by Phaser (e.g. inspecting an inventory item). */
function sayLocal (speaker: SpeakerId, key: string) {
    enqueue({ lines: [{ speaker, key }], onDone: () => {} });
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
.choice { font: 28px sans-serif; padding: 8px 20px; background: #2d3a7a; color: #fff; border: 3px solid #f3e3b5; border-radius: 10px; cursor: pointer; }
.next { position: absolute; right: 24px; bottom: 12px; font-size: 32px; color: #ffd75e; animation: blink 1s infinite; }
@keyframes blink { 50% { opacity: 0; } }
</style>
