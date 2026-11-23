export type TextSpeed = 'slow' | 'normal' | 'fast';

/** Characters per second for each text speed setting. */
export const TEXT_SPEED_CPS: Record<TextSpeed, number> = { slow: 30, normal: 40, fast: 60 };

/** How many characters of a line are visible `elapsedMs` after it started printing. */
export function charsVisible(elapsedMs: number, speed: TextSpeed, total: number): number {
    if (elapsedMs <= 0) return 0;
    return Math.min(total, Math.floor((elapsedMs * TEXT_SPEED_CPS[speed]) / 1000));
}

/** The ending card prints slower than normal lines. */
export const CARD_CPS = 25;

export function charsVisibleCps(elapsedMs: number, cps: number, total: number): number {
    if (elapsedMs <= 0) return 0;
    return Math.min(total, Math.floor((elapsedMs * cps) / 1000));
}
