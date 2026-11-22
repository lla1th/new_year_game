<script setup lang="ts">
import { computed, onUnmounted, reactive } from 'vue';
import { bus } from '../events';
import { getGameData } from '../game/data/gameData';
import { INVENTORY_SIZE, type ItemId } from '../game/data/types';
import { gameState } from '../state/gameState';
import { clientToGame } from './coords';
import { canvasRect } from './stage';
import { uiState } from './uiState';
import Placeholder from './Placeholder.vue';

const emit = defineEmits<{ inspect: [itemId: ItemId] }>();

const LONG_PRESS_MS = 500;
const DRAG_START_PX = 8;
const TOUCH_LIFT = 60;   // game px the dragged icon is lifted above a finger

const data = getGameData()!;
const slots = computed(() => Array.from({ length: INVENTORY_SIZE }, (_, i) => gameState.inventory[i] ?? null));
const disabled = computed(() => uiState.dialogActive || uiState.paused);
const icon = (id: ItemId) => `${import.meta.env.BASE_URL}assets/${data.items[id]?.icon ?? ''}`;

const drag = reactive({
    itemId: null as ItemId | null,
    slot: -1,
    pointerId: -1,
    startX: 0,
    startY: 0,
    dragging: false,
    touch: false,
    gx: 0,
    gy: 0,
});
let pressTimer: ReturnType<typeof setTimeout> | null = null;

function clearPress () {
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = null;
}

function toGame (e: PointerEvent) {
    const r = canvasRect();
    return r ? clientToGame(e.clientX, e.clientY, r) : { x: 0, y: 0 };
}

function onDown (e: PointerEvent, i: number) {
    const id = slots.value[i];
    if (!id || disabled.value || e.button === 2) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    Object.assign(drag, { itemId: id, slot: i, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, dragging: false, touch: e.pointerType === 'touch' });
    const g = toGame(e);
    drag.gx = g.x;
    drag.gy = g.y;
    clearPress();
    pressTimer = setTimeout(() => {
        pressTimer = null;
        if (drag.itemId && !drag.dragging) {
            const it = drag.itemId;
            reset();
            emit('inspect', it);
        }
    }, LONG_PRESS_MS);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
}

function onMove (e: PointerEvent) {
    if (e.pointerId !== drag.pointerId || !drag.itemId) return;
    if (!drag.dragging && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) >= DRAG_START_PX) {
        drag.dragging = true;
        clearPress();
    }
    const g = toGame(e);
    drag.gx = g.x;
    drag.gy = g.y;
}

function onUp (e: PointerEvent) {
    if (e.pointerId !== drag.pointerId) return;
    const id = drag.itemId;
    const wasDragging = drag.dragging;
    const lift = drag.touch ? TOUCH_LIFT : 0;
    const from = drag.slot;
    reset();
    if (!id || !wasDragging) return;
    // Over another slot → combine; over the canvas → drop on the scene; otherwise it just returns to its slot.
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-slot]') as HTMLElement | null;
    if (el) {
        const other = slots.value[Number(el.dataset.slot)];
        if (other && Number(el.dataset.slot) !== from) bus.emit('item:combine', { a: id, b: other });
        return;
    }
    const r = canvasRect();
    if (!r || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    const g = clientToGame(e.clientX, e.clientY, r);
    bus.emit('item:drop', { itemId: id, x: g.x, y: g.y - lift });
}

function onCancel (e: PointerEvent) {
    if (e.pointerId === drag.pointerId) reset();
}

function reset () {
    clearPress();
    drag.itemId = null;
    drag.slot = -1;
    drag.pointerId = -1;
    drag.dragging = false;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
}

function onContext (i: number) {
    const id = slots.value[i];
    if (id && !disabled.value) emit('inspect', id);
}

onUnmounted(reset);
</script>

<template>
    <div class="inventory" :class="{ disabled }" data-test="inventory">
        <div
            v-for="(id, i) in slots" :key="i" class="slot" :data-slot="i" :data-item="id ?? ''"
            :class="{ lifted: drag.dragging && drag.slot === i }"
            @pointerdown="onDown($event, i)" @contextmenu.prevent="onContext(i)"
        >
            <Placeholder v-if="id" :src="icon(id)" :color-key="id" :label="data.texts.t(data.items[id].nameKey)" />
        </div>
    </div>
    <div
        v-if="drag.dragging && drag.itemId" class="ghost"
        :style="{ left: `${drag.gx - 60}px`, top: `${drag.gy - 60 - (drag.touch ? TOUCH_LIFT : 0)}px` }"
    >
        <Placeholder :src="icon(drag.itemId)" :color-key="drag.itemId" :label="data.texts.t(data.items[drag.itemId].nameKey)" />
    </div>
</template>

<style scoped>
.inventory { position: absolute; left: 50%; bottom: 24px; transform: translateX(-50%); display: flex; gap: 16px; pointer-events: auto; transition: opacity .2s; }
.inventory.disabled { opacity: .45; pointer-events: none; }
.slot { width: 120px; height: 120px; box-sizing: border-box; border: 4px solid #f3e3b5; border-radius: 16px; background: rgba(20, 24, 48, .75); padding: 8px; touch-action: none; cursor: grab; }
.slot.lifted { opacity: .35; }
.ghost { position: absolute; width: 120px; height: 120px; pointer-events: none; opacity: .9; z-index: 10; }
</style>
