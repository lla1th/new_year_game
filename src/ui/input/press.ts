/** Touch press classification (UI_UX §6): long press = inspect; a finger that moved > 12 px is a drag, not a tap. */
export const LONG_PRESS_MS = 500;
export const DRAG_THRESHOLD_PX = 12;

export function classifyPress(durationMs: number, movedPx: number): 'tap' | 'long' | 'drag' {
    if (movedPx > DRAG_THRESHOLD_PX) return 'drag';
    return durationMs >= LONG_PRESS_MS ? 'long' : 'tap';
}

/**
 * What the scene does when a finger is lifted (the long-press timer has not fired yet):
 * a cancelled touch (system gesture, incoming call) does nothing; tap → use; long → inspect; drag → nothing.
 */
export function releaseAction(durationMs: number, movedPx: number, canceled: boolean): 'use' | 'inspect' | 'none' {
    if (canceled) return 'none';
    const kind = classifyPress(durationMs, movedPx);
    return kind === 'tap' ? 'use' : kind === 'long' ? 'inspect' : 'none';
}
