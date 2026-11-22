<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { colorFromKey } from '../game/assets/placeholder';

/** Image with a coloured placeholder (key + label) when the file is missing — DOM twin of ensureTexture. */
const props = defineProps<{ src?: string; colorKey: string; label: string }>();
const failed = ref(false);
watch(() => props.src, () => { failed.value = false; });
const bg = computed(() => `#${colorFromKey(props.colorKey).toString(16).padStart(6, '0')}`);
</script>

<template>
    <img v-if="src && !failed" class="ph-img" :src="src" alt="" draggable="false" @error="failed = true" />
    <div v-else class="ph-box" :style="{ background: bg }"><span>{{ label }}</span></div>
</template>

<style scoped>
.ph-img, .ph-box { width: 100%; height: 100%; display: block; object-fit: contain; pointer-events: none; user-select: none; }
.ph-box { display: flex; align-items: center; justify-content: center; border: 3px solid rgba(0,0,0,.5); box-sizing: border-box; }
.ph-box span { color: #fff; font: bold 16px sans-serif; text-align: center; word-break: break-all; padding: 4px; text-shadow: 0 0 3px #000; }
</style>
