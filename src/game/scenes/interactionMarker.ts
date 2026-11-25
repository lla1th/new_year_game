import type { GameObjects, Scene } from 'phaser';

/** Small pixel glint with a dark edge, visible on both bright and dark scenery. */
export function addInteractionMarker(scene: Scene, x: number, y: number): GameObjects.Graphics {
    const marker = scene.add.graphics({ x, y });
    const pixel = 4;
    const draw = (widths: readonly number[], color: number) => {
        marker.fillStyle(color);
        for (const [i, width] of widths.entries()) {
            marker.fillRect(-width * pixel / 2, (i - widths.length / 2) * pixel, width * pixel, pixel);
        }
    };
    draw([1, 3, 3, 5, 9, 5, 3, 3, 1], 0x37243a);
    draw([1, 1, 3, 7, 3, 1, 1], 0xffd489);
    marker.fillStyle(0xfff2ba).fillRect(-2, -2, 4, 4);
    return marker;
}
