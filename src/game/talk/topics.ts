import { LEVEL_ORDER } from '../data/types';
import type { TalkDef, TalkTopic } from '../data/schemas';
import type { GameStateModel } from '../../state/GameStateModel';

export const talkKey = (talkId: string, topicId: string): string => `${talkId}.${topicId}`;

/** Темы, доступные сейчас: флаги when/unless, уровни fromLevel/toLevel, once — только пока не просмотрена. */
export function availableTopics(def: TalkDef, talkId: string, state: GameStateModel): TalkTopic[] {
    const level = LEVEL_ORDER.indexOf(state.levelId);
    return def.topics.filter(t => {
        if (t.when !== undefined && !state.hasFlag(t.when)) return false;
        if (t.unless !== undefined && state.hasFlag(t.unless)) return false;
        if (t.fromLevel !== undefined && level < LEVEL_ORDER.indexOf(t.fromLevel)) return false;
        if (t.toLevel !== undefined && level > LEVEL_ORDER.indexOf(t.toLevel)) return false;
        if (t.once === true && state.hasSeenTalk(talkKey(talkId, t.id))) return false;
        return true;
    });
}
