import { onMounted, onUnmounted, reactive } from 'vue';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/data/types';

/**
 * Rectangle of the fitted 1920×1080 game inside the window (same rule as Phaser Scale.FIT + CENTER_BOTH).
 * The Vue UI layer uses it to scale together with the canvas.
 */
export function useStageRect () {
    const rect = reactive({ left: 0, top: 0, width: GAME_WIDTH, height: GAME_HEIGHT, scale: 1 });
    const update = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const scale = Math.min(w / GAME_WIDTH, h / GAME_HEIGHT);
        rect.scale = scale;
        rect.width = GAME_WIDTH * scale;
        rect.height = GAME_HEIGHT * scale;
        rect.left = (w - rect.width) / 2;
        rect.top = (h - rect.height) / 2;
    };
    onMounted(() => { update(); window.addEventListener('resize', update); });
    onUnmounted(() => window.removeEventListener('resize', update));
    return rect;
}

/** Bounding rect of the game canvas (falls back to the computed stage rect). */
export function canvasRect (): DOMRect | null {
    const c = document.querySelector('#game-container canvas');
    return c ? c.getBoundingClientRect() : null;
}
