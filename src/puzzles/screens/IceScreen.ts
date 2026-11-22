import type { GameObjects } from 'phaser';
import { getGameData } from '../../game/data/gameData';
import { OverlayScreen } from '../../game/scenes/OverlayScene';
import type { Vec2 } from '../../game/nav/geometry';
import { ICE, availableDirs, createIce, pushBox, type Dir, type IceState } from '../logic/ice';

const CELL = 124;
const GRID_Y = -40;
const SLIDE_MS_PER_CELL = 90;
const ARROW: Record<Dir, string> = { up: '▲', down: '▼', left: '◀', right: '▶' };
const OFFSET: Record<Dir, Vec2> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

/** P-05 close-up: 5×5 ice floor seen from above; crates slide until they hit something. */
export class IceScreen extends OverlayScreen {
    state: IceState = createIce();
    private container: GameObjects.Container;
    private crates: GameObjects.Container[] = [];
    private arrows: GameObjects.Text[] = [];
    private busy = false;

    create(container: GameObjects.Container): void {
        const s = this.scene;
        this.container = container;
        this.busy = false;
        this.arrows = [];
        container.add(s.add.rectangle(0, this.cellY(0) - CELL * 0.75, ICE.size * CELL, 24, 0x5d4037));   // the shelf
        for (let y = 0; y < ICE.size; y++) {
            for (let x = 0; x < ICE.size; x++) {
                container.add(s.add.rectangle(this.cellX(x), this.cellY(y), CELL - 4, CELL - 4, 0xb3e5fc).setStrokeStyle(2, 0x81d4fa));
            }
        }
        for (const t of ICE.targets) {
            container.add(s.add.rectangle(this.cellX(t.x), this.cellY(t.y), CELL - 30, CELL - 30).setStrokeStyle(6, 0xff7043));
        }
        for (const o of ICE.obstacles) {
            container.add(s.add.circle(this.cellX(o.x), this.cellY(o.y), CELL / 2 - 10, 0xeceff1).setStrokeStyle(4, 0x90a4ae));
        }
        this.crates = this.state.boxes.map((b, i) => {
            const crate = s.add.container(this.cellX(b.x), this.cellY(b.y)).setName(`crate-${i}`);
            const body = s.add.rectangle(0, 0, CELL - 24, CELL - 24, 0x8d6e63).setStrokeStyle(6, 0x4e342e).setInteractive({ useHandCursor: true });
            body.on('pointerdown', () => this.select(i));
            crate.add([body, s.add.text(0, 0, i === 0 ? 'A' : 'B', { fontFamily: 'sans-serif', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5)]);
            container.add(crate);
            return crate;
        });
        const label = getGameData()?.texts.t('ui.reset') ?? 'Reset';
        const reset = s.add.text(0, 360, label, { fontFamily: 'sans-serif', fontSize: '36px', color: '#ffffff', backgroundColor: '#3a2d5a', padding: { x: 24, y: 8 } })
            .setOrigin(0.5).setInteractive({ useHandCursor: true }).setName('ice-reset');
        reset.on('pointerdown', () => this.reset());
        container.add(reset);
    }

    private cellX(x: number): number { return (x - (ICE.size - 1) / 2) * CELL; }
    private cellY(y: number): number { return GRID_Y + (y - (ICE.size - 1) / 2) * CELL; }

    private clearArrows(): void {
        for (const a of this.arrows) a.destroy();
        this.arrows = [];
    }

    /** Arrows only for the directions where the crate can move at least one cell. */
    private select(i: number): void {
        if (this.busy || this.state.solved) return;
        this.clearArrows();
        const b = this.state.boxes[i];
        for (const d of availableDirs(this.state, i)) {
            const o = OFFSET[d];
            const a = this.scene.add.text(this.cellX(b.x) + o.x * CELL * 0.62, this.cellY(b.y) + o.y * CELL * 0.62, ARROW[d], {
                fontFamily: 'sans-serif', fontSize: '44px', color: '#d84315', backgroundColor: '#ffffffcc', padding: { x: 6, y: 0 },
            }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setName(`arrow-${i}-${d}`);
            a.on('pointerdown', () => this.push(i, d));
            this.container.add(a);
            this.arrows.push(a);
        }
    }

    private push(i: number, d: Dir): void {
        if (this.busy) return;
        const from = this.state.boxes[i];
        const next = pushBox(this.state, i, d);
        if (next === this.state) return;
        this.clearArrows();
        this.state = next;
        const to = next.boxes[i];
        const cells = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
        this.busy = true;
        this.services.sfx('sfx_ice_slide');
        this.scene.tweens.add({
            targets: this.crates[i], x: this.cellX(to.x), y: this.cellY(to.y), duration: cells * SLIDE_MS_PER_CELL,
            onComplete: () => {
                this.services.sfx('sfx_crate_hit');
                this.busy = false;
                if (this.state.solved) {
                    this.busy = true;
                    this.scene.time.delayedCall(600, () => this.solve());
                }
            },
        });
    }

    private reset(): void {
        if (this.busy || this.state.solved) return;
        this.clearArrows();
        this.state = createIce(this.state.resets + 1);
        this.state.boxes.forEach((b, i) => this.crates[i].setPosition(this.cellX(b.x), this.cellY(b.y)));
        if (this.state.resets === 3) void this.services.say('ksyusha', 'l05.reset.3');
    }
}
