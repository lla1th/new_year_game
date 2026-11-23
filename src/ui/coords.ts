import { GAME_HEIGHT, GAME_WIDTH } from '../game/data/types';
import type { Vec2 } from '../game/nav/geometry';

export interface RectLike { left: number; top: number; width: number; height: number }

/** Screen (client) coordinates → game coordinates 1920×1080, given the canvas bounding rect. */
export function clientToGame(clientX: number, clientY: number, rect: RectLike): Vec2 {
    return {
        x: ((clientX - rect.left) * GAME_WIDTH) / rect.width,
        y: ((clientY - rect.top) * GAME_HEIGHT) / rect.height,
    };
}
