import { showVisual } from '../assets/anims';
import { distance } from '../nav/geometry';
import type { LevelScene } from '../scenes/LevelScene';
import { registerAnim, registerLevelVisual } from '../scenes/registry';

function climbPole(scene: LevelScene): void {
    const monkey = scene.getSprite('monkey');
    if (!monkey || scene.tweens.getTweensOf(monkey).length) return;
    showVisual(monkey, 'l02_monkey_climb');
    syncMonkeyKey(scene);
    scene.tweens.add({
        targets: monkey, y: 286, duration: 2100, ease: 'Sine.easeInOut',
        yoyo: true, hold: 350, repeat: -1, repeatDelay: 380,
        onUpdate: () => syncMonkeyKey(scene),
    });
}

function syncMonkeyKey(scene: LevelScene): void {
    const monkey = scene.getSprite('monkey');
    if (!monkey) return;
    monkey.setDepth(monkey.y + 1);
    scene.getSprite('monkey_key')?.setPosition(monkey.x + 9 * monkey.scaleX, monkey.y - 11 * monkey.scaleY).setDepth(monkey.depth + 1);
}

/** The entrance couple's marker and inspect area travel with them. */
function walkEntranceCouple(scene: LevelScene): void {
    const couple = scene.getSprite('walkers');
    const { walkers_corner: corner, walkers_turn: end } = scene.map.points;
    if (!couple || !corner || !end) return;
    const start = { x: couple.x, y: couple.y };
    const first = distance(start, corner);
    const second = distance(corner, end);
    if (!first || !second) return;
    const length = first + second;
    const speed = 127 / 1000;
    const rest = 720;
    const leg = rest + length / speed;
    let elapsed = 0;
    scene.animateHotspot('walkers', delta => {
        elapsed = (elapsed + delta) % (2 * leg);
        const returning = elapsed >= leg;
        const phase = elapsed % leg;
        const travelled = Math.max(0, phase - rest) * speed;
        const along = returning ? length - travelled : travelled;
        const t = along < first ? along / first : (along - first) / second;
        const [a, b] = along < first ? [start, corner] : [corner, end];
        couple.setPosition(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t).setDepth(couple.y + 1);
        if (delta > 0 && phase >= rest) {
            couple.setFlipX(returning);
            showVisual(couple, 'l02_walkers_walk');
        } else {
            showVisual(couple, 'l02_walkers_idle');
        }
    });
}

/** Background guests have distinct routes and don't take over hotspot input. */
function walkFairGuest(scene: LevelScene, name: string, speed: number, delay: number): void {
    const guest = scene.getSprite(name);
    const end = scene.map.points[`${name}_turn`];
    if (!guest || !end || scene.tweens.getTweensOf(guest).length) return;
    const movingLeft = end.x < guest.x;
    guest.setFlipX(movingLeft);
    guest.anims.pause();
    scene.tweens.add({
        targets: guest, x: end.x, y: end.y, duration: distance(guest, end) * 1000 / speed,
        delay, yoyo: true, repeat: -1,
        onStart: () => guest.anims.resume(),
        onUpdate: () => guest.setDepth(guest.y + 1),
        onYoyo: () => guest.setFlipX(!movingLeft),
        onRepeat: () => guest.setFlipX(movingLeft),
    });
}

/** The fair's characters and props follow the current puzzle state. */
registerLevelVisual('L02', scene => {
    const st = scene.registryState();
    const show = (name: string, visible: boolean) => scene.getSprite(name)?.setVisible(visible);
    const alive = st.hasFlag('L02_FAIR_ALIVE');
    show('gate_bars', !st.hasFlag('L02_GATE_OPEN'));
    show('monkey_key', !st.hasItem('ITEM_GATE_KEY') && !st.hasFlag('L02_GATE_OPEN'));
    show('foil', !st.hasFlag('L02_FOIL_TAKEN'));
    if (scene.currentScreenId === 'gate') climbPole(scene);
    show('vendor_ice', !alive);
    show('vendor', alive);
    show('lantern_bulb', !st.hasFlag('L02_BULB_RED_TAKEN'));
    show('booth_key', !st.hasFlag('L02_SHED_KEY_TAKEN'));
    show('frozen_walkers', !alive);
    show('walkers', alive);
    for (const name of ['square_couple', 'guest_balloon', 'guest_cocoa', 'guest_muffs']) show(name, alive);
    if (alive && scene.currentScreenId === 'entrance') {
        walkEntranceCouple(scene);
        walkFairGuest(scene, 'guest_muffs', 115, 200);
    }
    if (alive && scene.currentScreenId === 'square') {
        walkFairGuest(scene, 'square_couple', 127, 0);
        walkFairGuest(scene, 'guest_balloon', 151, 160);
        walkFairGuest(scene, 'guest_cocoa', 93, 410);
    }
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

/** The monkey leaves its patrol long enough to reach the exchange crate. */
registerAnim('monkey_swap', scene => new Promise<void>(resolve => {
    const monkey = scene.getSprite('monkey');
    if (!monkey) { resolve(); return; }
    scene.tweens.killTweensOf(monkey);
    scene.tweens.add({
        targets: monkey, y: 605, duration: 550, ease: 'Sine.easeInOut',
        onUpdate: () => syncMonkeyKey(scene),
        onComplete: () => {
            scene.getSprite('monkey_key')?.setVisible(false);
            scene.tweens.add({
                targets: monkey, y: 540, duration: 450, ease: 'Sine.easeInOut',
                onUpdate: () => syncMonkeyKey(scene),
                onComplete: () => resolve(),
            });
        },
    });
}));

/** The cat jumps into the «hole in space» next to the unfinished teleporter and disappears. */
registerAnim('cat_jump', scene => new Promise<void>(resolve => {
    const cat = scene.getSprite('cat');
    const hole = scene.map.points.cat_hole;
    if (!cat || !hole) { resolve(); return; }
    const start = { x: cat.x, y: cat.y };
    const scale = cat.scale;
    const jump = { progress: 0 };
    cat.anims.stop();
    cat.setTexture('cat_w1_motion', 8);
    cat.setFlipX(hole.x < start.x);
    scene.tweens.add({
        targets: jump, progress: 1, duration: 730, ease: 'Sine.easeInOut',
        onUpdate: () => {
            const t = jump.progress;
            cat.setFrame(t < 0.12 ? 8 : t < 0.48 ? 9 : t < 0.82 ? 10 : 11);
            const floorY = start.y + (hole.y - start.y) * t;
            cat.setPosition(start.x + (hole.x - start.x) * t, floorY - 104 * Math.sin(Math.PI * t))
                .setDepth(floorY + 1).setScale(scale * (1 - 0.78 * t));
        },
        onComplete: () => { cat.setVisible(false).setScale(scale); resolve(); },
    });
}));
