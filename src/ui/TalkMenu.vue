<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { bus } from '../events';
import { getGameData } from '../game/data/gameData';
import type { TalkTopic } from '../game/data/schemas';
import { availableTopics, talkKey, topicMarksSeen } from '../game/talk/topics';
import { gameState } from '../state/gameState';

const props = defineProps<{ talkId: string }>();
const data = getGameData()!;
const t = (k: string) => data.texts.t(k);

const def = computed(() => data.talks[props.talkId]);
// While a topic's dialog is on screen the menu is hidden and returns afterwards.
const playing = ref(false);
const topics = computed(() => (def.value ? availableTopics(def.value, props.talkId, gameState) : []));
const seen = (topic: TalkTopic) => topicMarksSeen(topic) && gameState.hasSeenTalk(talkKey(props.talkId, topic.id));

let offDialog: (() => void) | null = null;
function pick (topic: TalkTopic) {
    if (playing.value) return;
    if (topic.hint) {
        // Same as the spitz button: close the menu first (the scene is busy while it is open), then ask for the hint.
        bus.emit('talk:close');
        setTimeout(() => bus.emit('hint:request'), 0);
        return;
    }
    if (!topic.dialog) return;
    const dialogId = topic.dialog;
    playing.value = true;
    offDialog = bus.on('dialog:end', e => {
        if (e.dialogId !== dialogId) return;
        offDialog?.();
        offDialog = null;
        if (topicMarksSeen(topic)) gameState.markTalkSeen(talkKey(props.talkId, topic.id));
        playing.value = false;
    });
    bus.emit('dialog:start', { dialogId });
}
const bye = () => bus.emit('talk:close');
onUnmounted(() => offDialog?.());
</script>

<template>
    <div v-show="!playing" class="talk" data-test="talk-menu">
        <div class="box">
            <button v-for="topic in topics" :key="topic.id" :data-test="`talk-${topic.id}`" @click="pick(topic)">
                {{ t(topic.menuKey) }}<span v-if="seen(topic)"> ✓</span>
            </button>
            <button class="bye" data-test="talk-bye" @click="bye">{{ t('talk.bye') }}</button>
        </div>
    </div>
</template>

<style scoped>
.talk { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, .5); pointer-events: auto; }
.box { display: flex; flex-direction: column; gap: 16px; align-items: stretch; padding: 40px 64px; background: rgba(20, 24, 48, .95); border: 4px solid #f3e3b5; border-radius: 24px; max-width: 1200px; }
button { font: bold 36px sans-serif; padding: 14px 32px; border-radius: 16px; border: 4px solid #f3e3b5; background: #2d3a7a; color: #fff; cursor: pointer; text-align: left; }
button:hover { background: #ffd75e; color: #1d2240; }
.bye { text-align: center; background: #444a66; }
</style>
