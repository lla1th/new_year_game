import { ensureTexture } from '../assets/placeholder';
import type { Vec2 } from '../nav/geometry';
import type { LevelScene } from '../scenes/LevelScene';
import { registerCutscene } from '../scenes/registry';

const point = (scene: LevelScene, name: string, fallback: Vec2): Vec2 => scene.map.points[name] ?? fallback;

/**
 * End of world 1 (STORY.md L03): the melody scares the cat, she drops the Spring, the spitz catches it;
 * «Это ещё не конец, хвостатый!» — and she jumps into the clock face. The brush transition comes in M4.
 */
registerCutscene('world1_2', async (scene, skipped) => {
    let isSkipped = false;
    void skipped.then(() => { isSkipped = true; });
    const tween = (cfg: Phaser.Types.Tweens.TweenBuilderConfig) =>
        Promise.race([new Promise<void>(r => scene.tweens.add({ ...cfg, onComplete: () => r() })), skipped]);
    const cat = scene.getSprite('cat');
    const clock = point(scene, 'clock_face', { x: 1700, y: 160 });
    const catchAt = scene.spitz ? { x: scene.spitz.x, y: scene.spitz.y - 60 } : { x: scene.position.x, y: scene.position.y - 200 };
    const spring = scene.add.image(cat?.x ?? 960, cat?.y ?? 220, ensureTexture(scene, 'part_spring', 48, 48, '⚙')).setDepth(6000);
    try {
        if (cat) await tween({ targets: cat, y: cat.y - 30, duration: 120, yoyo: true, repeat: 2 });   // startled
        if (isSkipped) return;
        await tween({ targets: spring, x: catchAt.x, y: catchAt.y, duration: 700, ease: 'Quad.easeIn' });
        if (isSkipped) return;
        await Promise.race([scene.say('cat', 'l03.dlg.cat.1'), skipped]);
        if (isSkipped || !cat) return;
        await tween({ targets: cat, x: clock.x, y: clock.y, scale: 0.2, alpha: 0, duration: 900, ease: 'Quad.easeIn' });
    } finally {
        scene.tweens.killTweensOf(spring);
        spring.destroy();
        cat?.setVisible(false);
    }
});

