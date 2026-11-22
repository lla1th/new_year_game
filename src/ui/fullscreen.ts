/** Browser Fullscreen API (MDN): available only where the browser supports it. */
export function fullscreenSupported (): boolean {
    return typeof document !== 'undefined' && document.fullscreenEnabled === true;
}

export function isFullscreen (): boolean {
    return typeof document !== 'undefined' && document.fullscreenElement !== null;
}

/** Must be called from a user gesture (click). Errors (denied) are only logged. */
export async function setFullscreen (on: boolean): Promise<void> {
    if (!fullscreenSupported()) return;
    try {
        if (on && !isFullscreen()) await document.documentElement.requestFullscreen();
        if (!on && isFullscreen()) await document.exitFullscreen();
    } catch (e) {
        console.warn('[fullscreen] request failed', e);
    }
}
