/** Anything that can report whether its puzzle is already solved (OverlayScreen). */
export interface SolvedProbe { isSolved(): boolean }

/**
 * Result of closing a screen: a screen whose puzzle is already solved counts as solved even when the player
 * closes it (✕ / background) during the short success animation — otherwise the rewards would never come.
 */
export function closeResult(requestedSolved: boolean, screen: SolvedProbe): boolean {
    return requestedSolved || screen.isSolved();
}

/** Opening a screen whose puzzle is already solved resolves at once as solved (no soft-lock on reopening). */
export function openShortcut(screen: SolvedProbe): boolean {
    return screen.isSolved();
}
