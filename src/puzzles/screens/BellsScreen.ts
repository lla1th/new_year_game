import type { GameObjects } from 'phaser';
import { ensureTexture } from '../../game/assets/placeholder';
import { getGameData } from '../../game/data/gameData';
import { OverlayScreen } from '../../game/scenes/OverlayScene';
import { BELL_LAYOUT, createBells, ringBell, type BellSymbol, type BellsState } from '../logic/bells';

export const BELL_MARK: Record<BellSymbol, string> = { snowflake: '❄', star: '★', tree: '▲', bell: '🔔' };
const BELL_GAP = 240;
const BELL_Y = 120;
const OFF = 0x8d6e63;
const ON = 0xffd54f;

/** P-03 close-up: four bells under the beam with the cat. */
export class BellsScreen extends OverlayScreen {
    state: BellsState = createBells();
    private bodies: GameObjects.Arc[] = [];
    private cat: GameObjects.Image;
    private locked = false;

    create(container: GameObjects.Container): void {
        const s = this.scene;
        this.locked = false;
        container.add(s.add.rectangle(0, -230, 1100, 24, 0x5d4037));   // beam
        const catName = getGameData()?.characters.names.cat ?? 'cat';
        this.cat = s.add.image(0, -290, ensureTexture(s, 'cat_w1_idle', 120, 90, catName));
        container.add(this.cat);
        this.bodies = [];
        BELL_LAYOUT.forEach((sym, i) => {
            const x = (i - 1.5) * BELL_GAP;
            container.add(s.add.line(0, 0, x, -218, x, BELL_Y - 80, 0x3e2723).setOrigin(0, 0).setLineWidth(4));
            const bell = s.add.container(x, BELL_Y);
            const body = s.add.circle(0, 0, 80, OFF).setStrokeStyle(6, 0x4e342e).setInteractive({ useHandCursor: true });
            const mark = s.add.text(0, 0, BELL_MARK[sym], { fontFamily: 'sans-serif', fontSize: '64px', color: '#ffffff' }).setOrigin(0.5);
            bell.add([body, mark]).setName(`bell-${sym}`);
            body.on('pointerdown', () => this.ring(sym, bell));
            container.add(bell);
            this.bodies.push(body);
        });
        this.paint();
    }

    /** Correctly pressed bells (the first `progress` of the order) stay lit. */
    private paint(): void {
        const lit = new Set(this.litSymbols());
        BELL_LAYOUT.forEach((sym, i) => this.bodies[i]?.setFillStyle(lit.has(sym) ? ON : OFF));
    }

    private litSymbols(): BellSymbol[] {
        const order: BellSymbol[] = ['snowflake', 'star', 'tree', 'bell'];
        return order.slice(0, this.state.progress);
    }

    private ring(sym: BellSymbol, bell: GameObjects.Container): void {
        if (this.locked) return;
        const r = ringBell(this.state, sym);
        if (r.result === 'ignored') return;
        this.state = r.state;
        this.services.sfx(`sfx_bell_${BELL_LAYOUT.indexOf(sym) + 1}`);
        this.scene.tweens.add({ targets: bell, angle: { from: -12, to: 12 }, duration: 120, yoyo: true, repeat: 1, onComplete: () => bell.setAngle(0) });
        if (r.result === 'wrong') {
            this.services.sfx('sfx_bell_wrong');
            this.services.sfx('sfx_cat_giggle');
            this.scene.tweens.add({ targets: this.cat, y: this.cat.y - 20, duration: 90, yoyo: true, repeat: 2 });   // the cat giggles
            if (r.showHint) void this.services.say('spitz', 'l03.bells.hint');
        }
        this.paint();
        if (r.result === 'solved') {
            this.locked = true;
            this.services.sfx('sfx_bells_melody');
            this.scene.time.delayedCall(700, () => this.solve());
        }
    }
}
