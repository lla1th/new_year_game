import type { GameObjects } from 'phaser';
import type { ItemId } from '../../game/data/types';
import type { Vec2 } from '../../game/nav/geometry';
import { OverlayScreen } from '../../game/scenes/OverlayScene';
import { BULB_ITEM, completeGarland, createGarland, insertBulb, removeBulb, type BulbColor, type GarlandState } from '../logic/garland';

const SOCKET_GAP = 200;
const SOCKET_Y = 20;
const BULB_R = 46;
const HIT_R = 80;
const BLINK_MS = 100;            // 3 red blinks within 0.6 s
const COLORS: Record<BulbColor, number> = { red: 0xe53935, green: 0x43a047, gold: 0xffc107, blue: 0x1e88e5 };
// Second cue besides colour (UI_UX §8): each colour has its own highlight shape.
const MARKS: Record<BulbColor, string> = { red: '●', green: '▲', gold: '★', blue: '◆' };
const ITEM_COLOR: Partial<Record<ItemId, BulbColor>> = { ITEM_BULB_GREEN: 'green', ITEM_BULB_GOLD: 'gold', ITEM_BULB_BLUE: 'blue' };

/** P-02 close-up: five sockets; bulbs are dragged in from the inventory. */
export class GarlandScreen extends OverlayScreen {
    state: GarlandState = createGarland();
    private container: GameObjects.Container;
    private bulbs: (GameObjects.Container | null)[] = [];
    private locked = false;

    isSolved(): boolean { return this.state.solved; }

    create(container: GameObjects.Container): void {
        this.container = container;
        this.locked = false;
        const s = this.scene;
        const wire = s.add.graphics();
        wire.lineStyle(6, 0x2e2e2e, 1);
        wire.beginPath();
        wire.moveTo(-520, SOCKET_Y - 90);
        for (let i = 0; i < 5; i++) wire.lineTo(this.socketX(i), SOCKET_Y - BULB_R - 10);
        wire.lineTo(520, SOCKET_Y - 90);
        wire.strokePath();
        container.add(wire);
        for (let i = 0; i < 5; i++) {
            const sock = s.add.circle(this.socketX(i), SOCKET_Y, BULB_R + 6, 0x111111, 1).setStrokeStyle(4, 0x777777);
            container.add(sock);
        }
        this.bulbs = [];
        for (let i = 0; i < 5; i++) this.bulbs.push(null);
        this.redraw();
    }

    dropItem(itemId: ItemId, p: Vec2): void {
        const color = ITEM_COLOR[itemId];
        if (!color || this.locked || this.state.solved) return;
        const idx = this.socketAt(p);
        if (idx < 0) return;
        const next = insertBulb(this.state, idx, color);
        if (!next) return;   // fixed / occupied: the bulb stays in the inventory
        this.state = next;
        this.services.state.removeItem(itemId);
        this.redraw();
        this.afterChange();
    }

    private socketX(i: number): number {
        return (i - 2) * SOCKET_GAP;
    }

    private socketAt(p: Vec2): number {
        const lx = p.x - this.container.x;
        const ly = p.y - this.container.y;
        for (let i = 0; i < 5; i++) {
            if (Math.hypot(lx - this.socketX(i), ly - SOCKET_Y) <= HIT_R) return i;
        }
        return -1;
    }

    private redraw(): void {
        const s = this.scene;
        for (let i = 0; i < 5; i++) {
            this.bulbs[i]?.destroy();
            this.bulbs[i] = null;
            const c = this.state.sockets[i];
            if (!c) continue;
            const bulb = s.add.container(this.socketX(i), SOCKET_Y);
            const body = s.add.circle(0, 0, BULB_R, COLORS[c], 1).setStrokeStyle(4, 0xffffff, 0.6).setName('body');
            const mark = s.add.text(0, 0, MARKS[c], { fontFamily: 'sans-serif', fontSize: '36px', color: '#ffffff' }).setOrigin(0.5);
            bulb.add([body, mark]);
            if (this.state.fixed[i]) {
                bulb.add(s.add.text(0, BULB_R + 22, '🔒', { fontSize: '26px' }).setOrigin(0.5));
            } else if (!this.state.solved) {
                body.setInteractive({ useHandCursor: true });
                body.on('pointerdown', () => this.takeOut(i));
            }
            if (this.state.solved) body.setStrokeStyle(10, 0xfff59d, 1);
            bulb.setName(`bulb-${i}`);
            this.container.add(bulb);
            this.bulbs[i] = bulb;
        }
    }

    private takeOut(i: number): void {
        if (this.locked) return;
        const r = removeBulb(this.state, i);
        if (!r.color || r.color === 'red') return;
        this.state = r.state;
        this.services.state.addItem(BULB_ITEM[r.color]);
        this.redraw();
    }

    private afterChange(): void {
        const r = completeGarland(this.state);
        if (r.result === 'incomplete') return;
        if (r.result === 'solved') {
            this.state = r.state;   // solved now: closing during the animation still counts (isSolved)
            this.locked = true;
            this.redraw();
            this.scene.tweens.add({
                targets: this.bulbs.filter((x): x is GameObjects.Container => !!x), scale: 1.15, duration: 250, yoyo: true,
                onComplete: () => this.solve(),
            });
            return;
        }
        // Wrong: the wrong bulbs leave the garland and go back to the inventory right away (state first),
        // then their old images blink red 3 times (0.6 s) as decoration — closing the screen loses nothing.
        const ghosts = r.wrongIdx.map(i => this.bulbs[i]).filter((x): x is GameObjects.Container => !!x);
        r.wrongIdx.forEach(i => { this.bulbs[i] = null; });
        this.state = r.state;
        for (const c of r.returned) if (c !== 'red') this.services.state.addItem(BULB_ITEM[c]);
        this.redraw();
        for (const g of ghosts) (g.getByName('body') as GameObjects.Arc | null)?.setFillStyle(0xff0000, 1);
        this.locked = true;
        this.scene.tweens.add({
            targets: ghosts, alpha: 0.15, duration: BLINK_MS, yoyo: true, repeat: 2,
            onComplete: () => {
                for (const g of ghosts) g.destroy();
                this.locked = false;
                void this.services.say('ksyusha', 'l02.garland.wrong');
            },
        });
    }
}
