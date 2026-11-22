import type { GameObjects } from 'phaser';
import { ensureTexture } from '../assets/placeholder';
import { getGameData } from '../data/gameData';
import type { Vec2 } from '../nav/geometry';
import { OverlayScreen, registerScreen } from '../scenes/OverlayScene';
import { characterName, type LevelScene } from '../scenes/LevelScene';
import { registerAnim, registerCutscene, registerLevelVisual } from '../scenes/registry';

const t = (key: string) => getGameData()?.texts.t(key) ?? key;
const point = (scene: LevelScene, name: string, fallback: Vec2): Vec2 => scene.map.points[name] ?? fallback;

// --- Fridge close-up -------------------------------------------------------------

class FridgeScreen extends OverlayScreen {
    create(container: GameObjects.Container): void {
        const s = this.scene;
        const state = this.services.state;
        container.add(s.add.image(0, 0, ensureTexture(s, 'w1_fridge_close', 1000, 700, 'fridge')));
        const available = !state.hasItem('ITEM_SAUSAGE') && !state.hasFlag('L01_SPITZ_FREED');
        if (!available) return;   // empty shelf
        const key = ensureTexture(s, 'l01_sausage', 260, 110, t('item.ITEM_SAUSAGE.name'));
        const sausage = s.add.image(-120, 40, key).setInteractive({ useHandCursor: true }).setName('fridge-sausage');
        container.add(sausage);
        sausage.once('pointerdown', () => {
            sausage.destroy();
            if (state.addItem('ITEM_SAUSAGE')) this.services.progress();
            void this.services.say('ksyusha', 'l01.fridge.take');
        });
    }
}
registerScreen('fridge', () => new FridgeScreen());

// --- Level visuals ----------------------------------------------------------------

registerLevelVisual('L01', scene => {
    // The mandarin on the table disappears once taken; the terrarium glows when the portal is open.
    scene.getSprite('mandarin')?.setVisible(!scene.registryState().hasItem('ITEM_MANDARIN'));
    const glow = scene.getSprite('terrarium_glow');
    if (glow) {
        const open = scene.registryState().hasFlag('L01_PORTAL_OPEN');
        glow.setVisible(open);
        if (open && !scene.tweens.isTweening(glow)) {
            scene.tweens.add({ targets: glow, alpha: { from: 0.55, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
        }
    }
});

// --- Animations -------------------------------------------------------------------

/** The spitz jumps out from under the sofa with a spring and then follows Ksyusha. */
registerAnim('spitz_out', scene => new Promise<void>(resolve => {
    const p = point(scene, 'spitz_under_sofa', { x: scene.position.x + 120, y: scene.position.y });
    const sp = scene.showSpitz(p);
    sp.setScale(0.2);
    scene.tweens.add({
        targets: sp, scale: 1, y: p.y - 80, duration: 260, ease: 'Back.easeOut', yoyo: true,
        onComplete: () => { sp.setScale(1).setPosition(p.x, p.y); resolve(); },
    });
}));

/** Ksyusha and the spitz are sucked into the terrarium (0.8 s) with a flash. */
registerAnim('portal', scene => new Promise<void>(resolve => {
    const p = point(scene, 'portal', scene.position);
    const targets = [scene.ksyusha, scene.spitz].filter((o): o is GameObjects.Image => !!o);
    scene.tweens.add({ targets, x: p.x, y: p.y, scale: 0, angle: 360, duration: 800, ease: 'Cubic.easeIn' });
    scene.time.delayedCall(800, () => { scene.cameras.main.flash(250, 255, 255, 255); resolve(); });
}));

// --- Intro cutscene (≈15 s) ---------------------------------------------------------

registerCutscene('l01_intro', async (scene, skipped) => {
    let isSkipped = false;
    void skipped.then(() => { isSkipped = true; });
    const wait = (ms: number) => Promise.race([new Promise<void>(r => scene.time.delayedCall(ms, () => r())), skipped]);
    const objs: GameObjects.GameObject[] = [];
    const spawn = point(scene, 'spawn', scene.position);
    const clockP = point(scene, 'clock_fx', { x: 400, y: 260 });
    const windowP = point(scene, 'window_fx', { x: 800, y: 260 });
    const sofaP = point(scene, 'spitz_under_sofa', { x: 1000, y: 700 });
    try {
        scene.placeKsyusha(spawn);
        scene.setFacing('ur');
        const cap = scene.caption('l01.cutscene.1');
        objs.push(cap);
        const clock = scene.add.text(clockP.x, clockP.y, '23:58', { fontFamily: 'monospace', fontSize: '48px', color: '#ff5252', backgroundColor: '#000000' })
            .setOrigin(0.5).setDepth(5000);
        objs.push(clock);
        const flakes: GameObjects.Rectangle[] = [];
        for (let i = 0; i < 24; i++) {
            const f = scene.add.rectangle(windowP.x - 140 + Math.random() * 280, windowP.y - 120, 8, 8, 0xffffff).setDepth(5000);
            flakes.push(f);
            objs.push(f);
            scene.tweens.add({ targets: f, y: windowP.y + 120, duration: 1800 + Math.random() * 1200, repeat: -1, delay: Math.random() * 1500 });
        }
        await wait(3500);
        if (isSkipped) return;
        cap.setText(t('l01.cutscene.2'));
        clock.setText('23:59');
        scene.tweens.add({ targets: clock, alpha: 0.3, duration: 200, yoyo: true, repeat: 3 });
        await wait(3500);
        if (isSkipped) return;
        cap.setText(t('l01.cutscene.3'));
        for (const f of flakes) scene.tweens.getTweensOf(f).forEach(tw => tw.pause());   // snow freezes
        await wait(3500);
        if (isSkipped) return;
        cap.setText(t('l01.cutscene.4'));
        scene.setFacing('dr');
        const sp = scene.add.image(windowP.x, windowP.y, ensureTexture(scene, 'spitz_w1_idle', 120, 90, characterName('spitz'))).setDepth(6000);
        objs.push(sp);
        await Promise.race([
            new Promise<void>(r => scene.tweens.add({ targets: sp, x: sofaP.x, y: sofaP.y, angle: 720, duration: 1600, ease: 'Quad.easeIn', onComplete: () => r() })),
            skipped,
        ]);
        if (isSkipped) return;
        await Promise.race([
            new Promise<void>(r => scene.tweens.add({ targets: sp, alpha: 0, scale: 0.3, duration: 400, onComplete: () => r() })),
            skipped,
        ]);
        await wait(1500);
    } finally {
        // Final state regardless of skipping: Ksyusha by the tree, the spitz hidden under the sofa.
        for (const o of objs) { scene.tweens.killTweensOf(o); o.destroy(); }
        scene.placeKsyusha(spawn);
        scene.setFacing('dr');
    }
});
