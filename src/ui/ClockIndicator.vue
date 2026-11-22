<script setup lang="ts">
import { computed, onUnmounted, reactive } from 'vue';
import { bus } from '../events';
import { gameState } from '../state/gameState';
import type { PartId } from '../game/data/types';
import { clientToGame } from './coords';
import { canvasRect } from './stage';

const SOCKETS: PartId[] = ['PART_SPRING', 'PART_GEAR', 'PART_HANDS'];
const MARK: Record<PartId, string> = { PART_SPRING: '〰', PART_GEAR: '⚙', PART_HANDS: '⌚' };
const filled = computed(() => SOCKETS.map(p => gameState.parts.includes(p)));
const count = computed(() => filled.value.filter(Boolean).length);

// L08: parts are dragged from here onto the Clock (UI_UX §2).
const drag = reactive({ part: null as PartId | null, pointerId: -1, gx: 0, gy: 0, moved: false, sx: 0, sy: 0 });

function toGame (e: PointerEvent) {
    const r = canvasRect();
    return r ? clientToGame(e.clientX, e.clientY, r) : { x: 0, y: 0 };
}

function onDown (e: PointerEvent, part: PartId) {
    if (!gameState.parts.includes(part)) return;
    e.preventDefault();
    const g = toGame(e);
    Object.assign(drag, { part, pointerId: e.pointerId, gx: g.x, gy: g.y, moved: false, sx: e.clientX, sy: e.clientY });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', reset);
}

function onMove (e: PointerEvent) {
    if (e.pointerId !== drag.pointerId) return;
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
    const g = toGame(e);
    drag.gx = g.x;
    drag.gy = g.y;
}

function onUp (e: PointerEvent) {
    if (e.pointerId !== drag.pointerId) return;
    const part = drag.part;
    const moved = drag.moved;
    reset();
    const r = canvasRect();
    if (!part || !moved || !r || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    const g = clientToGame(e.clientX, e.clientY, r);
    bus.emit('part:drop', { partId: part, x: g.x, y: g.y });   // a wrong place: the part simply stays in the indicator
}

function reset () {
    drag.part = null;
    drag.pointerId = -1;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', reset);
}
onUnmounted(reset);
</script>

<template>
    <div class="clock" data-test="clock">
        <div
            v-for="(f, i) in filled" :key="SOCKETS[i]" class="socket" :class="{ filled: f, dragging: drag.part === SOCKETS[i] }"
            :data-part="SOCKETS[i]" @pointerdown="onDown($event, SOCKETS[i])"
        >
            <span v-if="f">{{ MARK[SOCKETS[i]] }}</span>
        </div>
        <div class="count">{{ count }}/3</div>
    </div>
    <div v-if="drag.part && drag.moved" class="ghost" :style="{ left: `${drag.gx - 40}px`, top: `${drag.gy - 40}px` }">{{ MARK[drag.part] }}</div>
</template>

<style scoped>
.clock { position: absolute; left: 24px; top: 24px; display: flex; gap: 12px; align-items: center; pointer-events: auto; }
.socket { width: 72px; height: 72px; border-radius: 50%; border: 4px solid #f3e3b5; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; color: #ffd75e; font-size: 40px; transition: transform .3s; touch-action: none; }
.socket.filled { background: rgba(255,215,94,.25); transform: scale(1.08); cursor: grab; }
.socket.dragging { opacity: .35; }
.count { color: #fff; font: bold 32px sans-serif; text-shadow: 0 2px 4px #000; margin-left: 8px; }
.ghost { position: absolute; width: 80px; height: 80px; font-size: 64px; color: #ffd75e; text-align: center; pointer-events: none; z-index: 10; text-shadow: 0 0 8px #000; }
</style>
