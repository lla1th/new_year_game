import { registerLevelVisual } from '../scenes/registry';

registerLevelVisual('L06', scene => {
    const done = scene.registryState().hasFlag('L06_BRIDGE_DONE');
    scene.getSprite('bridge')?.setVisible(done);
    const cat = scene.getSprite('cat');
    if (cat && !scene.tweens.isTweening(cat)) {
        scene.tweens.add({ targets: cat, y: cat.y - 14, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });   // teasing on the next roof
    }
});
