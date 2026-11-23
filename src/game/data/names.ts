export const DEFAULT_SPITZ_NAME = 'Шпиц';

/** Имя шпица для текстов: до выбора (и при незаполненном поле автора) — «Шпиц». */
export function spitzDisplayName(choice: 1 | 2 | null, dict: Record<string, string>): string {
    if (choice === null) return DEFAULT_SPITZ_NAME;
    return dict[`name.option.${choice}`] ?? DEFAULT_SPITZ_NAME;
}
