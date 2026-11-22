import { registerAnim, registerLevelVisual } from '../scenes/registry';

registerLevelVisual('L03', scene => {
    const st = scene.registryState();
    scene.getSprite('door_closed')?.setVisible(!st.hasFlag('L03_DOOR_OPEN'));
    const owl = scene.getSprite('owl');
    const wall = scene.map.points.owl_wall;
    if (owl && wall && st.hasFlag('L03_OWL_AWAKE') && !scene.tweens.isTweening(owl)) owl.setPosition(wall.x, wall.y);
    scene.getSprite('cat')?.setVisible(!st.hasFlag('L03_BELLS_DONE'));
});

/** The awake owl steps aside to the wall and no longer blocks the stairs. */
registerAnim('owl_move', scene => new Promise<void>(resolve => {
    const owl = scene.getSprite('owl');
    const wall = scene.map.points.owl_wall;
    if (!owl || !wall) { resolve(); return; }
    scene.tweens.add({ targets: owl, x: wall.x, y: wall.y, duration: 700, ease: 'Sine.easeInOut', onComplete: () => resolve() });
}));
