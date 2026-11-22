import type { GameObjects } from 'phaser';
import { ensureTexture } from '../assets/placeholder';
import type { Vec2 } from '../nav/geometry';
import { characterName, type LevelScene } from '../scenes/LevelScene';
import { registerAnim, registerCutscene, registerHintResolver, registerLevelVisual } from '../scenes/registry';

const point = (scene: LevelScene, name: string, fallback: Vec2): Vec2 => scene.map.points[name] ?? fallback;

registerLevelVisual('L02', scene => {
    const st = scene.registryState();
    scene.getSprite('bulb_green')?.setVisible(!st.hasFlag('L02_BULB_GREEN_TAKEN'));
    scene.getSprite('snowman_nose')?.setVisible(!st.hasFlag('L02_SNOWMAN_SAD'));
    scene.getSprite('snowman_mandarin')?.setVisible(st.hasFlag('L02_SNOWMAN_HAPPY'));
    scene.getSprite('bulb_blue')?.setVisible(st.hasFlag('L02_CAROUSEL_SPUN') && !st.hasFlag('L02_BULB_BLUE_TAKEN'));
    scene.getSprite('nika_ice')?.setVisible(!st.hasFlag('L02_GARLAND_DONE'));
    scene.getSprite('gate_bars')?.setVisible(!st.hasFlag('L02_GATE_OPEN'));
});

/** Hint step 2 names only the places of bulbs that are not found yet (P-02). */
registerHintResolver('L02', (key, scene) => {
    if (key !== 'hint.P-02.2') return null;
    const st = scene.registryState();
    const missing: string[] = [];
    if (!st.hasFlag('L02_BULB_GREEN_TAKEN')) missing.push('hint.P-02.2.green');
    if (!st.hasFlag('L02_SNOWMAN_SAD')) missing.push('hint.P-02.2.gold');
    if (!st.hasFlag('L02_BULB_BLUE_TAKEN')) missing.push('hint.P-02.2.blue');
    return [...missing, 'hint.P-02.2'];
});

registerAnim('carousel_spin', scene => new Promise<void>(resolve => {
    scene.cameras.main.shake(400, 0.004);
    scene.time.delayedCall(600, () => resolve());
}));

registerAnim('nika_thaw', scene => new Promise<void>(resolve => {
    const ice = scene.getSprite('nika_ice');
    if (!ice) { resolve(); return; }
    scene.tweens.add({ targets: ice, alpha: 0, duration: 900, onComplete: () => { ice.setVisible(false).setAlpha(1); resolve(); } });
}));

/** «Дразнилка»: the cat with the Spring on the stall roof, a taunt, a jump over the gate. */
registerCutscene('l02_tease', async (scene, skipped) => {
    let isSkipped = false;
    void skipped.then(() => { isSkipped = true; });
    const roof = point(scene, 'cat_roof', { x: 960, y: 290 });
    const gate = point(scene, 'cat_gate', { x: 530, y: 150 });
    const cat = scene.add.image(roof.x, roof.y, ensureTexture(scene, 'cat_w1_idle', 120, 90, characterName('cat'))).setDepth(5000);
    const objs: GameObjects.GameObject[] = [cat];
    try {
        await Promise.race([new Promise<void>(r => scene.tweens.add({ targets: cat, alpha: { from: 0, to: 1 }, duration: 400, onComplete: () => r() })), skipped]);
        if (isSkipped) return;
        await Promise.race([scene.say('cat', 'l02.dlg.cat.1'), skipped]);
        if (isSkipped) return;
        await Promise.race([
            new Promise<void>(r => scene.tweens.add({ targets: cat, x: gate.x, y: gate.y - 120, duration: 700, ease: 'Quad.easeOut', yoyo: false, onComplete: () => r() })),
            skipped,
        ]);
        if (isSkipped) return;
        await Promise.race([new Promise<void>(r => scene.tweens.add({ targets: cat, y: gate.y + 80, alpha: 0, duration: 400, onComplete: () => r() })), skipped]);
    } finally {
        for (const o of objs) { scene.tweens.killTweensOf(o); o.destroy(); }
    }
});
