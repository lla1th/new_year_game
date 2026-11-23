<script setup lang="ts">
import { ref } from 'vue';
import { ALL_ITEM_IDS, FLAG_IDS, type FlagId, type ItemId, type LevelId, type PartId } from '../game/data/types';
import { debugGivePart, debugGiveItem, debugGotoLevel, debugSetFlag } from '../game/debug';

// Developer tool: English labels on purpose (not player-visible in normal mode).
const LEVEL_IDS: LevelId[] = ['L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08'];
const PARTS: PartId[] = ['PART_SPRING', 'PART_GEAR', 'PART_HANDS'];
const open = ref(false);
const level = ref<LevelId>('L01');
const item = ref<ItemId>(ALL_ITEM_IDS[0]);
const flag = ref<FlagId>(FLAG_IDS[0]);
const part = ref<PartId>(PARTS[0]);
</script>

<template>
    <div class="debug" data-test="debug-panel">
        <button class="toggle" @click="open = !open">DEBUG</button>
        <div v-if="open" class="body">
            <div><select v-model="level" data-test="dbg-level"><option v-for="l in LEVEL_IDS" :key="l">{{ l }}</option></select>
                <button data-test="dbg-goto" @click="debugGotoLevel(level)">go</button></div>
            <div><select v-model="item" data-test="dbg-item"><option v-for="i in ALL_ITEM_IDS" :key="i">{{ i }}</option></select>
                <button data-test="dbg-give" @click="debugGiveItem(item)">give</button></div>
            <div><select v-model="flag" data-test="dbg-flag"><option v-for="f in FLAG_IDS" :key="f">{{ f }}</option></select>
                <button data-test="dbg-set" @click="debugSetFlag(flag)">set</button></div>
            <div><select v-model="part"><option v-for="p in PARTS" :key="p">{{ p }}</option></select>
                <button @click="debugGivePart(part)">part</button></div>
        </div>
    </div>
</template>

<style scoped>
.debug { position: absolute; left: 24px; top: 120px; pointer-events: auto; font: 22px monospace; color: #fff; z-index: 20; }
.toggle { font: 20px monospace; background: #a00; color: #fff; border: 0; padding: 6px 12px; cursor: pointer; }
.body { margin-top: 8px; padding: 12px; background: rgba(0, 0, 0, .8); display: flex; flex-direction: column; gap: 8px; }
select, .body button { font: 20px monospace; }
</style>
