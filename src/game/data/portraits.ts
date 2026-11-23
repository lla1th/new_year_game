import type { CharactersFile } from './schemas';
import type { MoodId, SpeakerId, WorldStyle } from './types';

/**
 * Путь портрета (относительно assets/) для говорящего.
 * Порядок: портрет реакции в стиле мира → обычный портрет в стиле мира → undefined (тогда UI рисует заглушку).
 */
export function resolvePortrait (c: CharactersFile, speaker: SpeakerId, style: WorldStyle, mood?: MoodId): string | undefined {
    if (mood) {
        const m = c.moods?.[speaker]?.[mood]?.[style];
        if (m) return m;
    }
    return c.portraits[speaker]?.[style];
}
