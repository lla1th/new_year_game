import type { GameObjects, Time } from 'phaser';
import { bus } from '../../events';
import { GAME_HEIGHT, GAME_WIDTH } from '../data/types';
import { getGameData } from '../data/gameData';
import { type LevelScene, WalkInterruptedError } from '../scenes/LevelScene';
import { registerCutscene } from '../scenes/registry';

const TITLE_DEPTH = 940_000;
const CLOCK_DIAL = 'l01_clock_dial';
const CLOCK_FACE_SIZE = 40;
const TICK_DELAYS_MS = [680, 720, 780, 860, 960, 1080, 1220, 1400, 1600];
const WINDOW_PANES = [
    { x: 600, y: 152, width: 116, height: 76 },
    { x: 764, y: 152, width: 116, height: 76 },
    { x: 600, y: 256, width: 116, height: 68 },
    { x: 764, y: 256, width: 116, height: 124 },
];
const CITY_LIGHTS = [
    [643, 327], [699, 318], [766, 326], [818, 345],
];

interface ApartmentAtmosphere {
    actor: GameObjects.Sprite;
    clock: GameObjects.Graphics;
    snow: { sprite: GameObjects.Rectangle; bottom: number; duration: number }[];
    lights: GameObjects.Rectangle[];
}
const atmospheres = new WeakMap<LevelScene, ApartmentAtmosphere>();

function createClock(scene: LevelScene, x: number, y: number, scale: number, depth: number) {
    const inset = CLOCK_FACE_SIZE * scale / 2;
    const left = x - inset;
    const top = y - inset;
    const face = scene.add.image(left, top, CLOCK_DIAL).setOrigin(0).setScale(scale).setDepth(depth);
    const hands = scene.add.graphics({ x: left, y: top }).setScale(scale).setDepth(depth + 1);
    return { face, hands };
}

function drawClock(g: GameObjects.Graphics, minutes: number) {
    const x = 20;
    const y = 19;
    g.clear();
    const hand = (fraction: number, length: number, thickness: number) => {
        const angle = fraction * Math.PI * 2;
        for (let step = 0; step <= length; step++) {
            g.fillRect(x + Math.round(Math.sin(angle) * step), y - Math.round(Math.cos(angle) * step), thickness, 1);
        }
    };
    g.fillStyle(0x2d1525);
    hand((11 + minutes / 60) / 12, 8, 2);
    hand(minutes / 60, 12, 1);
    g.fillStyle(0x713333).fillRect(x, y, 2, 2);
}

/** Keep the apartment at 23:59 even when the intro is skipped or the save is reopened. */
export function installApartmentAtmosphere(scene: LevelScene): void {
    if (atmospheres.get(scene)?.actor === scene.ksyusha) return;
    const clockPoint = scene.map.points.clock_fx;
    const { face, hands: clock } = createClock(scene, clockPoint.x, clockPoint.y, 4, 1);
    face.setName('apartment-clock');
    drawClock(clock, 59);
    const snow = WINDOW_PANES.flatMap((pane, paneIndex) => Array.from({ length: 6 }, (_, i) => {
        const x = pane.x + 4 + ((i * 37 + paneIndex * 13) % (pane.width - 8));
        const y = pane.y + 4 + ((i * 29 + paneIndex * 17) % (pane.height - 8));
        const size = i % 3 === 0 ? 6 : 4;
        return {
            sprite: scene.add.rectangle(x, y, size, size, 0xe5edff, i % 3 === 0 ? 0.9 : 0.55)
                .setName('window-snow').setDepth(1),
            bottom: pane.y + pane.height - 4,
            duration: 900 + i * 195,
        };
    }));
    const lights = CITY_LIGHTS.map(([x, y]) =>
        scene.add.rectangle(x, y, 7, 9, 0xffc471, 0.75).setName('window-lamp').setDepth(1));
    atmospheres.set(scene, { actor: scene.ksyusha, clock, snow, lights });
}

registerCutscene('l01_intro', async (scene, skipped) => {
    installApartmentAtmosphere(scene);
    const { actor, clock, snow, lights } = atmospheres.get(scene)!;
    const { spawn } = scene.map.points;
    const sofa = scene.getSprite('sofa');
    const sofaY = sofa?.y;
    const objects: GameObjects.GameObject[] = [];
    let cancelled = false;
    let stop!: () => void;
    const stopped = new Promise<void>(resolve => { stop = resolve; });
    scene.events.once('shutdown', stop);
    const interrupt = Promise.race([skipped, stopped]).then(() => { cancelled = true; });
    const wait = async (delay: number) => {
        let timer!: Time.TimerEvent;
        await Promise.race([
            new Promise<void>(resolve => {
                timer = scene.time.delayedCall(delay, resolve);
            }),
            interrupt,
        ]);
        timer.remove();
        return !cancelled;
    };
    const frame = (name: string) => {
        if (scene.anims.exists(name)) actor.play(name, true).setScale(4);
    };
    const walk = async (target: { x: number; y: number }) => {
        try {
            await Promise.race([scene.walkTo(target), interrupt]);
            return !cancelled;
        } catch (error) {
            if (error instanceof WalkInterruptedError) return false;
            throw error;
        }
    };
    const stopWindow = () => {
        for (const { sprite } of snow) scene.tweens.killTweensOf(sprite);
        for (const light of lights) scene.tweens.killTweensOf(light);
    };

    try {
        bus.emit('l01:intro', { active: true });
        drawClock(clock, 50);
        const shade = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x181528)
            .setDepth(TITLE_DEPTH).setName('intro-title-card');
        const lines = [1, 2, 3, 4].map(n => {
            const value = getGameData()?.texts.t(`l01.cutscene.${n}`) ?? '';
            return value.startsWith('⟨заполнить:') ? '···' : value;
        });
        const title = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, lines.join('\n'), {
            fontFamily: 'Georgia, serif', fontSize: '54px', color: '#ffdfad',
            align: 'center', lineSpacing: 19, wordWrap: { width: 1500 },
        }).setOrigin(0.5).setDepth(TITLE_DEPTH + 1).setName('intro-title-lines');
        objects.push(shade, title);
        if (!await wait(4400)) return;
        scene.tweens.add({ targets: [shade, title], alpha: 0, duration: 520, ease: 'Sine.easeInOut' });
        if (!await wait(540)) return;

        for (const { sprite, bottom, duration } of snow) {
            scene.tweens.add({ targets: sprite, y: bottom, duration, repeat: -1 });
        }
        lights.forEach((light, i) => {
            scene.tweens.add({ targets: light, alpha: { from: 0.1, to: 0.92 }, duration: 430 + 140 * i, yoyo: true, repeat: -1, delay: i * 150 });
        });
        scene.placeKsyusha(spawn);
        scene.setFacing('ul');
        frame('ksyusha_intro_ornament');
        if (!await wait(700)) return;
        frame('ksyusha_intro_reach');
        const ornament = scene.add.rectangle(321, 560, 13, 13, 0xffae47, 1).setDepth(735).setName('tree-ornament');
        objects.push(ornament);
        scene.tweens.add({ targets: ornament, alpha: { from: 0.15, to: 1 }, duration: 400, ease: 'Sine.easeOut' });
        if (!await wait(800)) return;

        if (!await walk({ x: 1064, y: 792 })) return;
        scene.setFacing('dr', 'r');
        frame('ksyusha_intro_box');
        if (!await wait(600)) return;
        if (!await walk(spawn)) return;
        scene.setFacing('ur');
        if (!await wait(480)) return;

        const darken = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x151123, 0.68)
            .setDepth(TITLE_DEPTH).setName('intro-clock-card');
        const card = scene.add.rectangle(960, 526, 660, 660, 0x412641)
            .setStrokeStyle(8, 0xd6a468).setDepth(TITLE_DEPTH + 1);
        const { face: closeFace, hands: dial } = createClock(scene, 960, 466, 12, TITLE_DEPTH + 2);
        closeFace.setName('intro-clock-texture');
        const time = scene.add.text(960, 764, '', { fontFamily: 'monospace', fontSize: '76px', color: '#ffdc9d' })
            .setOrigin(0.5).setDepth(TITLE_DEPTH + 3).setName('intro-clock-time');
        const clockCard = [darken, card, closeFace, dial, time];
        objects.push(...clockCard);
        const setTime = (minute: number) => {
            time.setText(`23:${minute}`);
            drawClock(dial, minute);
            drawClock(clock, minute);
        };
        for (const [step, delay] of TICK_DELAYS_MS.entries()) {
            setTime(50 + step);
            scene.playSfx('sfx_clock_tick', 1 - 0.88 * step / (TICK_DELAYS_MS.length - 1));
            if (!await wait(delay)) return;
        }
        setTime(59);
        stopWindow();
        if (!await wait(1130)) return;
        for (const object of clockCard) object.setVisible(false);
        scene.setFacing('dr', 'r');

        const flash = scene.add.ellipse(690, 729, 370, 46, 0xffdf9e, 0.95).setDepth(745).setName('sofa-flash');
        const spark = scene.add.ellipse(690, 739, 122, 20, 0xffefc0, 0.9).setDepth(745).setName('sofa-spark');
        objects.push(flash, spark);
        scene.playSfx('sfx_portal');
        if (sofa) scene.tweens.add({ targets: sofa, y: sofa.y - 25, duration: 140, yoyo: true, ease: 'Sine.easeOut' });
        scene.tweens.add({ targets: flash, alpha: 0, duration: 280, ease: 'Sine.easeOut' });
        scene.tweens.add({ targets: spark, alpha: { from: 0, to: 1 }, delay: 240, duration: 200, yoyo: true, ease: 'Sine.easeInOut' });
        if (!await wait(180)) return;
        frame('ksyusha_intro_surprise');
        const reaction = scene.caption('l01.cutscene.sofa_reaction').setName('intro-sofa-reaction')
            .setPosition(spawn.x + 260, spawn.y - 335).setOrigin(0.5, 1);
        objects.push(reaction);
        await wait(1750);
    } finally {
        scene.events.off('shutdown', stop);
        bus.emit('l01:intro', { active: false });
        for (const object of objects) {
            scene.tweens.killTweensOf(object);
            object.destroy();
        }
        stopWindow();
        if (scene.ksyusha === actor && actor.scene) {
            drawClock(clock, 59);
            if (sofa && sofaY !== undefined) {
                scene.tweens.killTweensOf(sofa);
                sofa.setY(sofaY);
            }
            scene.placeKsyusha(spawn);
            scene.setFacing('dr');
        }
    }
});
