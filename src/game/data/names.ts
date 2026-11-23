import type { GameStateModel } from '../../state/GameStateModel';
import type { TextBank } from './TextBank';

export const DEFAULT_SPITZ_NAME = 'Шпиц';

/** Имя шпица для текстов: до выбора (и при незаполненном поле автора) — «Шпиц». */
export function spitzDisplayName(choice: 1 | 2 | null, dict: Record<string, string>): string {
    if (choice === null) return DEFAULT_SPITZ_NAME;
    return dict[`name.option.${choice}`] ?? DEFAULT_SPITZ_NAME;
}

/**
 * Выбор имени на экране: 1 и 2 — имена на выбор, 3 («Марат») недоступен и ничего не меняет.
 */
export function applyNameChoice(state: GameStateModel, option: 1 | 2 | 3): 'chosen' | 'locked' {
    if (option === 3) return 'locked';
    state.spitzName = option;
    state.setFlag('L01_NAME_CHOSEN');
    return 'chosen';
}

/** Подставляет в тексты имя шпица из состояния (после загрузки сохранения, нового старта и выбора имени). */
export function applySpitzName(state: GameStateModel, texts: TextBank): void {
    const dict: Record<string, string> = {};
    for (const i of [1, 2]) {
        const key = `name.option.${i}`;
        if (texts.has(key)) dict[key] = texts.t(key);
    }
    texts.setName('spitz', spitzDisplayName(state.spitzName, dict));
}
