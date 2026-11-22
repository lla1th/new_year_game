import type { GameObjects } from 'phaser';
import type { PartId } from '../../game/data/types';
import type { Vec2 } from '../../game/nav/geometry';
import { OverlayScreen } from '../../game/scenes/OverlayScene';
import { CLOCK_SLOTS, fitsSlot } from '../logic/clock';

export { fitsSlot };

const SLOT_POS: Record<PartId, Vec2> = { PART_SPRING: { x: -260, y: 60 }, PART_GEAR: { x: 0, y: 160 }, PART_HANDS: { x: 260, y: 60 } };
const SLOT_R = 80;
const MARK: Record<PartId, string> = { PART_SPRING: '〰', PART_GEAR: '⚙', PART_HANDS: '⌚' };
const STYLE_COLOR: Record<PartId, number> = { PART_SPRING: 0x7e57c2, PART_GEAR: 0xff7043, PART_HANDS: 0x29b6f6 };   // world 1/2/3 flash

/** L08 close-up of the New Year Clock: three silhouettes; parts are dragged in from the HUD indicator. */
export class ClockScreen extends OverlayScreen {
    inserted: PartId[] = [];
    private container: GameObjects.Container;

    isSolved(): boolean { return this.inserted.length === CLOCK_SLOTS.length; }

    create(container: GameObjects.Container): void {
        const s = this.scene;
        this.container = container;
        container.add(s.add.circle(0, -20, 330, 0xfff3e0).setStrokeStyle(12, 0x8d6e63));   // the dial
        for (const slot of CLOCK_SLOTS) {
            const p = SLOT_POS[slot];
            container.add(s.add.circle(p.x, p.y, SLOT_R, 0x424242, 0.35).setStrokeStyle(6, 0x616161).setName(`slot-${slot}`));
            container.add(s.add.text(p.x, p.y, MARK[slot], { fontFamily: 'sans-serif', fontSize: '72px', color: '#9e9e9e' }).setOrigin(0.5).setAlpha(0.5));
            if (this.inserted.includes(slot)) this.drawPart(slot, false);
        }
        if (this.isSolved()) s.time.delayedCall(300, () => this.solve());
    }

    /** Own silhouette → it clicks in with a flash; any other place → it quietly goes back to the indicator. */
    dropPart(partId: PartId, p: Vec2): void {
        if (this.isSolved() || this.inserted.includes(partId)) return;
        const lx = p.x - this.container.x;
        const ly = p.y - this.container.y;
        const slot = CLOCK_SLOTS.find(sl => Math.hypot(lx - SLOT_POS[sl].x, ly - SLOT_POS[sl].y) <= SLOT_R + 20);
        if (!slot || !fitsSlot(partId, slot)) return;   // soft return, no line
        this.inserted.push(partId);
        this.services.state.removePart(partId);         // the indicator empties as parts go in
        this.services.sfx('sfx_part');
        this.drawPart(slot, true);
        if (this.isSolved()) this.scene.time.delayedCall(700, () => this.solve());
    }

    private drawPart(slot: PartId, flash: boolean): void {
        const p = SLOT_POS[slot];
        const part = this.scene.add.text(p.x, p.y, MARK[slot], { fontFamily: 'sans-serif', fontSize: '84px', color: '#ffd54f', stroke: '#3e2723', strokeThickness: 6 })
            .setOrigin(0.5).setName(`part-${slot}`);
        this.container.add(part);
        if (!flash) return;
        const ring = this.scene.add.circle(p.x, p.y, SLOT_R, STYLE_COLOR[slot], 0.8);
        this.container.add(ring);
        this.scene.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 450, onComplete: () => ring.destroy() });
    }
}
