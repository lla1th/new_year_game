import { registerAnim, registerLevelVisual } from '../scenes/registry';

/** The fair's characters and props follow the current puzzle state. */
registerLevelVisual('L02', scene => {
    const st = scene.registryState();
    const show = (name: string, visible: boolean) => scene.getSprite(name)?.setVisible(visible);
    const alive = st.hasFlag('L02_FAIR_ALIVE');
    show('gate_bars', !st.hasFlag('L02_GATE_OPEN'));
    show('monkey_key', !st.hasItem('ITEM_GATE_KEY') && !st.hasFlag('L02_GATE_OPEN'));
    show('vendor_ice', !alive);
    show('vendor', alive);
    show('lantern_bulb', !st.hasFlag('L02_BULB_RED_TAKEN'));
    show('booth_key', !st.hasFlag('L02_SHED_KEY_TAKEN'));
    show('frozen_walkers', !alive);
    show('walkers', alive);
    show('tent_ice', !alive);
    show('nika_ice', !alive);
    show('nika', alive);
    show('snowman_nose', !st.hasFlag('L02_SNOWMAN_SAD'));
    show('snowman_mandarin', st.hasFlag('L02_SNOWMAN_HAPPY'));
    show('bulb_blue', st.hasFlag('L02_CAROUSEL_SPUN') && !st.hasFlag('L02_BULB_BLUE_TAKEN'));
    show('pump_hose', !st.hasFlag('L02_PUMP_TAKEN'));
    if (st.hasFlag('L02_CAT_SCENE_DONE')) show('cat', false);
});

registerAnim('carousel_spin', scene => new Promise<void>(resolve => {
    scene.cameras.main.shake(400, 0.004);
    scene.time.delayedCall(600, () => resolve());
}));

/** The monkey climbs down for the foil and back up (0.6 s). */
registerAnim('monkey_swap', scene => new Promise<void>(resolve => {
    const monkey = scene.getSprite('monkey');
    if (!monkey) { resolve(); return; }
    const key = scene.getSprite('monkey_key');
    scene.tweens.add({ targets: key ? [monkey, key] : monkey, y: '+=140', duration: 300, yoyo: true, onComplete: () => resolve() });
}));

/** The cat jumps into the «hole in space» next to the unfinished teleporter and disappears. */
registerAnim('cat_jump', scene => new Promise<void>(resolve => {
    const cat = scene.getSprite('cat');
    const hole = scene.map.points.cat_hole;
    if (!cat || !hole) { resolve(); return; }
    const scale = cat.scale;   // real world-1 sprites are shown ×4
    scene.tweens.add({
        targets: cat, x: hole.x, y: hole.y, scale: scale * 0.2, duration: 700, ease: 'Quad.easeIn',
        onComplete: () => { cat.setVisible(false).setScale(scale); resolve(); },
    });
}));
