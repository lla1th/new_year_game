import { ensureTexture } from '../assets/placeholder';
import { registerAnim, registerLevelVisual } from '../scenes/registry';

registerLevelVisual('L07', scene => {
    scene.getSprite('hands')?.setVisible(!scene.registryState().hasFlag('L07_CAT_RECONCILED'));
});

/** The offended cat turns away for 1 s. */
registerAnim('cat_turn', scene => new Promise<void>(resolve => {
    const cat = scene.getSprite('cat');
    if (!cat) { resolve(); return; }
    cat.setFlipX(!cat.flipX);
    scene.playSfx('sfx_meow');
    scene.time.delayedCall(1000, () => { cat.setFlipX(!cat.flipX); resolve(); });
}));

/** The reconciled cat opens the portal home. */
registerAnim('cat_portal', scene => new Promise<void>(resolve => {
    const p = scene.map.points.cat_portal ?? { x: 1410, y: 300 };
    const portal = scene.add.image(p.x, p.y, ensureTexture(scene, 'l07_portal', 220, 220, '✦')).setDepth(5000).setScale(0.1).setAlpha(0.8);
    scene.tweens.add({ targets: portal, scale: 1, angle: 180, duration: 900, ease: 'Back.easeOut', onComplete: () => resolve() });
}));
