import type { GameObjects } from 'phaser';
import { bus } from '../../events';
import { ensureTexture } from '../assets/placeholder';
import type { FifteenScreen } from '../../puzzles/screens/FifteenScreen';
import { characterName } from '../scenes/LevelScene';
import { registerCutscene, registerHintResolver, registerLevelVisual } from '../scenes/registry';

registerLevelVisual('L08', scene => {
    if (scene.currentScreenId === 'post') {
        scene.spitz?.setVisible(false);   // he sleeps under the tree now
        return;
    }
    scene.getSprite('gift')?.setVisible(scene.registryState().hasFlag('L08_PARTS_INSERTED') && !scene.registryState().hasFlag('L08_GIFT_OPENED'));
});

/** P-08 hint step 3 = the auto-solve offer (as after 5 minutes). */
registerHintResolver('L08', (key, scene) => {
    if (key !== 'hint.P-08.3') return null;
    (scene.ensureScreen('P-08') as FifteenScreen | null)?.offerHelpNow();
    return [key];
});

/** Midnight (≈20 s): twelve strikes, the worlds mix, fireworks; the spitz and the cat sit side by side. */
registerCutscene('midnight', async (scene, skipped) => {
    let isSkipped = false;
    void skipped.then(() => { isSkipped = true; });
    const wait = (ms: number) => Promise.race([new Promise<void>(r => scene.time.delayedCall(ms, () => r())), skipped]);
    const objs: GameObjects.GameObject[] = [];
    const sky = scene.map.points.sky ?? { x: 960, y: 200 };
    const catSpot = scene.map.points.cat_spot ?? { x: 1500, y: 820 };
    try {
        const cat = scene.add.image(catSpot.x, catSpot.y, ensureTexture(scene, 'cat_fin_happy_medal', 120, 90, characterName('cat'))).setOrigin(0.5, 1).setDepth(catSpot.y);
        objs.push(cat);
        if (scene.spitz) scene.tweens.add({ targets: scene.spitz, x: catSpot.x - 110, y: catSpot.y, duration: 800 });
        const strike = scene.add.text(sky.x, sky.y, '', { fontFamily: 'Impact, sans-serif', fontSize: '96px', color: '#ffd54f', stroke: '#3e2723', strokeThickness: 10 }).setOrigin(0.5).setDepth(950_000);
        objs.push(strike);
        for (let i = 1; i <= 12; i++) {
            strike.setText(`${i}`).setScale(1.4);
            scene.tweens.add({ targets: strike, scale: 1, duration: 300 });
            scene.cameras.main.shake(150, 0.003);
            scene.playSfx('sfx_chime');
            await wait(1250);
            if (isSkipped) return;
        }
        strike.setText('00:00');
        scene.playSfx('sfx_fireworks');
        const colors = [0x7e57c2, 0xff7043, 0x29b6f6, 0xffeb3b, 0xe91e63];   // three styles mix + fireworks
        for (let k = 0; k < 24; k++) {
            const x = 200 + Math.random() * 1520;
            const y = 80 + Math.random() * 380;
            const c = scene.add.circle(x, y, 6, colors[k % colors.length]).setDepth(940_000);
            objs.push(c);
            scene.tweens.add({ targets: c, scale: 14, alpha: 0, duration: 900, delay: k * 200 });
        }
        await wait(5200);
    } finally {
        for (const o of objs) { scene.tweens.killTweensOf(o); o.destroy(); }
        scene.refreshVisuals();
    }
});

/** The card and the credits are Vue screens: show the card, wait until the credits are over (or skipped). */
registerCutscene('ending', () => new Promise<void>(resolve => {
    const off = bus.on('ending:post', () => { off(); resolve(); });
    bus.emit('ending:card');
}));

/** End of the post-credits scene: back to the main menu (with the level select open). */
registerCutscene('to_menu', () => {
    bus.emit('ending:done');
    return Promise.resolve();
});
