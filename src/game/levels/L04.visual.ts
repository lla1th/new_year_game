import { ensureTexture } from '../assets/placeholder';
import type { Vec2 } from '../nav/geometry';
import type { LevelScene } from '../scenes/LevelScene';
import { registerCutscene, registerLevelVisual } from '../scenes/registry';

const point = (scene: LevelScene, name: string, fallback: Vec2): Vec2 => scene.map.points[name] ?? fallback;

registerLevelVisual('L05', scene => {
    scene.getSprite('cat')?.setVisible(!scene.registryState().hasFlag('L05_CRATES_DONE'));
});

/** L05: Ksyusha climbs the crates, the cat drops the Gear («лапы мёрзнут!») and dives into the fridge portal. */
registerCutscene('l05_cat', async (scene, skipped) => {
    let isSkipped = false;
    void skipped.then(() => { isSkipped = true; });
    const tween = (cfg: Phaser.Types.Tweens.TweenBuilderConfig) =>
        Promise.race([new Promise<void>(r => scene.tweens.add({ ...cfg, onComplete: () => r() })), skipped]);
    const cat = scene.getSprite('cat');
    const shelf = point(scene, 'shelf_top', { x: 960, y: 250 });
    const fridge = point(scene, 'fridge_in', { x: 1680, y: 420 });
    const start = scene.position;
    const gear = scene.add.image(shelf.x, shelf.y, ensureTexture(scene, 'part_gear', 48, 48, '⚙')).setDepth(6000);
    try {
        await tween({ targets: scene.ksyusha, x: shelf.x - 120, y: shelf.y + 380, duration: 900, ease: 'Quad.easeOut' });   // climbs up
        if (isSkipped) return;
        await Promise.race([scene.say('cat', 'l05.dlg.cat.1'), skipped]);
        if (isSkipped) return;
        await tween({ targets: gear, y: shelf.y + 420, duration: 600, ease: 'Bounce.easeOut' });
        if (isSkipped || !cat) return;
        await tween({ targets: cat, x: fridge.x, y: fridge.y, scale: 0.2, alpha: 0, duration: 900, ease: 'Quad.easeIn' });
    } finally {
        scene.tweens.killTweensOf(gear);
        gear.destroy();
        cat?.setVisible(false);
        scene.placeKsyusha(start);
    }
});

