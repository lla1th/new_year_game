import type { GameObjects } from 'phaser';
import type { ItemId } from '../../game/data/types';
import type { Vec2 } from '../../game/nav/geometry';
import { OverlayScreen } from '../../game/scenes/OverlayScene';
import {
    BULB_COLORS, BULB_ITEM, bulbsComplete, createGenerator, ejectBulbs, insertBulb, pourFuel, pullCord,
    type BulbColor, type GeneratorState,
} from '../logic/generator';

const SOCKET_X: Record<BulbColor, number> = { red: -300, yellow: 0, blue: 300 };
const SOCKET_Y = -140;
const SOCKET_R = 56;
const HIT_R = 90;
const TANK = { x: -400, y: 170, w: 180, h: 220 };
const CORD = { x: 400, y: 170, w: 150, h: 220 };
const COLORS: Record<BulbColor, number> = { red: 0xe53935, yellow: 0xffc107, blue: 0x1e88e5 };
// Second cue besides colour (UI_UX §8): each colour has its own mark.
const MARKS: Record<BulbColor, string> = { red: '●', yellow: '★', blue: '◆' };
const ITEM_COLOR: Partial<Record<ItemId, BulbColor>> = { ITEM_BULB_RED: 'red', ITEM_BULB_YELLOW: 'yellow', ITEM_BULB_BLUE: 'blue' };

/** P-02 «Генератор»: three colour sockets, the tank (pump) and the cord. Bulbs and the pump are dragged from the inventory. */
export class GeneratorScreen extends OverlayScreen {
    private state: GeneratorState | null = null;
    private container: GameObjects.Container;
    private dynamic: GameObjects.GameObject[] = [];

    isSolved(): boolean { return this.state?.on === true; }

    create(container: GameObjects.Container): void {
        this.container = container;
        const st = this.services.state;
        // The first opening restores the state from the saved flags; later openings keep it.
        this.state ??= createGenerator({ bulbs: st.hasFlag('L02_BULBS_PLACED'), fueled: st.hasFlag('L02_FUELED') });
        const s = this.scene;
        for (const c of BULB_COLORS) {
            container.add(s.add.circle(SOCKET_X[c], SOCKET_Y, SOCKET_R, 0x111111, 1).setStrokeStyle(8, COLORS[c]));
            container.add(s.add.text(SOCKET_X[c], SOCKET_Y + SOCKET_R + 30, MARKS[c], { fontFamily: 'sans-serif', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5));
        }
        container.add(s.add.rectangle(TANK.x, TANK.y, TANK.w, TANK.h, 0x37474f, 1).setStrokeStyle(6, 0xb0bec5));
        container.add(s.add.rectangle(CORD.x, CORD.y, CORD.w, CORD.h, 0x4e342e, 1).setStrokeStyle(6, 0xd7ccc8));
        const cord = s.add.text(CORD.x, CORD.y, '⌇', { fontFamily: 'sans-serif', fontSize: '120px', color: '#ffffff' }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true }).setName('generator-cord');
        cord.on('pointerdown', () => this.pull());
        container.add(cord);
        this.redraw();
    }

    onClosed(solved: boolean): void {
        if (solved || !this.state) return;
        // Not all bulbs are in: they go back to the inventory, so no save can lose them.
        const r = ejectBulbs(this.state);
        this.state = r.state;
        for (const c of r.returned) this.services.state.addItem(BULB_ITEM[c]);
        if (r.returned.length) this.services.progress();
    }

    dropItem(itemId: ItemId, p: Vec2): void {
        if (!this.state || this.state.on) return;
        const color = ITEM_COLOR[itemId];
        if (color) { this.dropBulb(itemId, color, p); return; }
        if (itemId === 'ITEM_PUMP' && this.inTank(p)) this.dropPump();
    }

    private local(p: Vec2): Vec2 { return { x: p.x - this.container.x, y: p.y - this.container.y }; }

    private inTank(p: Vec2): boolean {
        const l = this.local(p);
        return Math.abs(l.x - TANK.x) <= TANK.w / 2 + 30 && Math.abs(l.y - TANK.y) <= TANK.h / 2 + 30;
    }

    private socketAt(p: Vec2): BulbColor | null {
        const l = this.local(p);
        return BULB_COLORS.find(c => Math.hypot(l.x - SOCKET_X[c], l.y - SOCKET_Y) <= HIT_R) ?? null;
    }

    private dropBulb(itemId: ItemId, bulb: BulbColor, p: Vec2): void {
        const socket = this.socketAt(p);
        if (!socket || !this.state) return;
        const r = insertBulb(this.state, socket, bulb);
        if (r.result === 'wrong') {
            this.services.sfx('sfx_bulb_wrong');
            void this.services.say('ksyusha', 'l02.generator.wrongsocket');   // the bulb stays in the inventory
            return;
        }
        if (r.result !== 'ok') return;
        this.state = r.state;
        this.services.state.removeItem(itemId);
        this.services.sfx('sfx_bulb_in');
        if (bulbsComplete(this.state)) this.services.state.setFlag('L02_BULBS_PLACED');
        this.services.progress();
        this.redraw();
    }

    private dropPump(): void {
        const st = this.services.state;
        if (!this.state) return;
        if (!st.hasFlag('L02_PUMP_FILLED')) {
            void this.services.say('ksyusha', 'l02.generator.pumpempty');
            return;
        }
        const r = pourFuel(this.state);
        if (r.result !== 'ok') return;
        this.state = r.state;
        st.clearFlag('L02_PUMP_FILLED');
        st.setFlag('L02_FUELED');
        this.services.progress();
        this.redraw();
    }

    private pull(): void {
        if (!this.state || this.state.on) return;
        const r = pullCord(this.state);
        if (r.result === 'sputter') {
            this.services.sfx('sfx_bulb_wrong');
            void this.services.say('ksyusha', 'l02.generator.sputter');
            return;
        }
        if (r.result !== 'on') return;
        this.state = r.state;
        this.services.sfx('sfx_garland_on');
        this.redraw();
        this.scene.time.delayedCall(500, () => this.solve());
    }

    private redraw(): void {
        const s = this.scene;
        const state = this.state;
        for (const o of this.dynamic) o.destroy();
        this.dynamic = [];
        if (!state) return;
        for (const c of BULB_COLORS) {
            if (!state.sockets[c]) continue;
            const bulb = s.add.circle(SOCKET_X[c], SOCKET_Y, SOCKET_R - 8, COLORS[c], 1).setStrokeStyle(state.on ? 10 : 4, state.on ? 0xfff59d : 0xffffff, 0.8);
            this.dynamic.push(bulb);
        }
        if (state.fueled) this.dynamic.push(s.add.rectangle(TANK.x, TANK.y + TANK.h / 2 - 80, TANK.w - 20, 150, 0xff9800, 1).setOrigin(0.5, 0.5).setDepth(1));
        this.container.add(this.dynamic);
    }
}
