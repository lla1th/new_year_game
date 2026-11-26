import type { GameObjects } from 'phaser';
import { showVisual } from '../assets/anims';
import { ensureTexture, isPlaceholder } from '../assets/placeholder';
import { getGameData } from '../data/gameData';
import type { Vec2 } from '../nav/geometry';
import { OverlayScreen, registerScreen } from '../scenes/OverlayScene';
import { addInteractionMarker } from '../scenes/interactionMarker';
import type { LevelScene } from '../scenes/LevelScene';
import { installApartmentAtmosphere } from './L01.intro';
import { registerAnim, registerLevelVisual } from '../scenes/registry';

const t = (key: string) => getGameData()?.texts.t(key) ?? key;
const point = (scene: LevelScene, name: string, fallback: Vec2): Vec2 => scene.map.points[name] ?? fallback;

// --- Fridge close-up -------------------------------------------------------------

class FridgeScreen extends OverlayScreen {
    create(container: GameObjects.Container): void {
        const s = this.scene;
        const state = this.services.state;
        // the real close-up picture is drawn by OverlayScene under the panel; here only the placeholder
        if (!s.textures.exists('w1_fridge_close') || isPlaceholder('w1_fridge_close')) container.add(s.add.image(0, 0, ensureTexture(s, 'w1_fridge_close', 1000, 700, 'fridge')));
        const available = !state.hasItem('ITEM_SAUSAGE') && !state.hasFlag('L01_SPITZ_FREED');
        if (!available) return;   // empty shelf
        const key = ensureTexture(s, 'l01_sausage', 260, 110, t('item.ITEM_SAUSAGE.name'));
        const sausage = s.add.image(-120, 40, key).setInteractive({ useHandCursor: true }).setName('fridge-sausage');
        const marker = addInteractionMarker(s, -57, 9).setName('sausage-marker');
        container.add([sausage, marker]);
        sausage.once('pointerdown', () => {
            sausage.destroy();
            marker.destroy();
            if (state.addItem('ITEM_SAUSAGE')) this.services.progress();
            void this.services.say('ksyusha', 'l01.fridge.take');
        });
    }
}
registerScreen('fridge', () => new FridgeScreen());

// --- Level visuals ----------------------------------------------------------------

function patrolWorkshop (scene: LevelScene, name: 'tik' | 'tak', speed: number, rest: number): void {
    const elf = scene.getSprite(name);
    const end = scene.map.points[`patrol_${name}`];
    if (!elf || !end) return;
    const start = { x: elf.x, y: elf.y };
    const travel = Math.hypot(end.x - start.x, end.y - start.y) * 1000 / speed;
    if (travel === 0) return;
    const leg = rest + travel;
    let elapsed = 0;
    scene.animateHotspot(name, delta => {
        if (delta === 0) {
            showVisual(elf, `l01b_${name}_idle`);
            return;
        }
        elapsed = (elapsed + delta) % (2 * leg);
        const returning = elapsed >= leg;
        const phase = elapsed % leg;
        const progress = Math.max(0, (phase - rest) / travel);
        const t = returning ? 1 - progress : progress;
        elf.setPosition(start.x + (end.x - start.x) * t, start.y + (end.y - start.y) * t).setDepth(elf.y + 1);
        const walking = phase >= rest;
        if (walking) elf.setFlipX(returning ? start.x < end.x : end.x < start.x);
        showVisual(elf, `l01b_${name}_${walking ? 'walk' : 'idle'}`);
    });
}

registerLevelVisual('L01', scene => {
    if (scene.currentScreenId === 'apartment') installApartmentAtmosphere(scene);
    if (scene.currentScreenId === 'workshop') {
        patrolWorkshop(scene, 'tik', 140, 650);
        patrolWorkshop(scene, 'tak', 85, 1600);
    }
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
    scene.playSfx('sfx_spitz_bark');
    scene.tweens.add({
        targets: sp, y: p.y - 52, duration: 230, ease: 'Sine.easeOut', yoyo: true,
        onComplete: () => { sp.setPosition(p.x, p.y); resolve(); },
    });
}));

/** Ksyusha and the spitz are sucked into the terrarium (0.8 s) with a flash. */
registerAnim('portal', scene => new Promise<void>(resolve => {
    const p = point(scene, 'portal', scene.position);
    const targets = [scene.ksyusha, scene.spitz].filter((o): o is GameObjects.Sprite => !!o);
    scene.playSfx('sfx_portal');
    scene.tweens.add({ targets, x: p.x, y: p.y, scale: 0, angle: 360, duration: 800, ease: 'Cubic.easeIn' });
    scene.time.delayedCall(800, () => { scene.cameras.main.flash(250, 255, 255, 255); resolve(); });
}));
