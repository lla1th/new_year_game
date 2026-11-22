import { onMounted, onUnmounted, reactive } from 'vue';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/data/types';

/**
 * Rectangle of the fitted 1920×1080 game inside the window (same rule as Phaser Scale.FIT + CENTER_BOTH).
 * The Vue UI layer uses it to scale together with the canvas.
 */
export function useStageRect () {
    const rect = reactive({ left: 0, top: 0, width: GAME_WIDTH, height: GAME_HEIGHT, scale: 1 });
    const update = () => {
        // The game is fitted inside #game-container (= the safe area); without it, inside the window.
        const box = document.getElementById('game-container')?.getBoundingClientRect();
        const x = box?.left ?? 0;
        const y = box?.top ?? 0;
        const w = box?.width || window.innerWidth;
        const h = box?.height || window.innerHeight;
        const scale = Math.min(w / GAME_WIDTH, h / GAME_HEIGHT);
        rect.scale = scale;
        rect.width = GAME_WIDTH * scale;
        rect.height = GAME_HEIGHT * scale;
        rect.left = x + (w - rect.width) / 2;
        rect.top = y + (h - rect.height) / 2;
    };
    const later = () => { update(); requestAnimationFrame(update); };
    // #game-container appears only after the loading screen (and is re-created with the game): watch for it
    // and follow its size, so the UI layer never stays fitted to the whole window instead of the safe area.
    let watched: Element | null = null;
    const resizeObs = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(later);
    const domObs = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => {
        const el = document.getElementById('game-container');
        if (el === watched) return;
        if (watched) resizeObs?.unobserve(watched);
        watched = el;
        if (el) resizeObs?.observe(el);
        later();
    });
    onMounted(() => {
        later();
        window.addEventListener('resize', later); window.addEventListener('orientationchange', later);
        domObs?.observe(document.body, { childList: true, subtree: true });
    });
    onUnmounted(() => {
        window.removeEventListener('resize', later); window.removeEventListener('orientationchange', later);
        domObs?.disconnect(); resizeObs?.disconnect();
    });
    return rect;
}

/** Bounding rect of the game canvas (falls back to the computed stage rect). */
export function canvasRect (): DOMRect | null {
    const c = document.querySelector('#game-container canvas');
    return c ? c.getBoundingClientRect() : null;
}
