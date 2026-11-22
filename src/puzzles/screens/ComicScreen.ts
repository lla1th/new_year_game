import type { GameObjects, Input } from 'phaser';
import { getGameData } from '../../game/data/gameData';
import { OverlayScreen } from '../../game/scenes/OverlayScene';
import { createComic, panelCorrect, swapPanels, type ComicState } from '../logic/comic';

const W = 400;
const H = 300;
const GAP = 24;
const COLORS = [0xef5350, 0x42a5f5, 0xffca28, 0x66bb6a];   // panel 1..4
const GREY = 0x8a8a8a;

/** P-06 close-up: 2×2 comic panels; drag a panel onto another to swap them. */
export class ComicScreen extends OverlayScreen {
    state: ComicState = createComic();
    private container: GameObjects.Container;
    private panels: GameObjects.Container[] = [];
    private dragging: { pos: number; dx: number; dy: number } | null = null;
    private locked = false;

    isSolved(): boolean { return this.state.solved; }

    create(container: GameObjects.Container): void {
        this.container = container;
        this.locked = this.state.solved;
        this.dragging = null;
        this.panels = [];
        for (let pos = 0; pos < 4; pos++) this.panels.push(this.makePanel(pos));
        const input = this.scene.input;
        input.on('pointermove', (p: Input.Pointer) => this.onMove(p));
        input.on('pointerup', (p: Input.Pointer) => this.onUp(p));
    }

    private slot(pos: number): { x: number; y: number } {
        return { x: (pos % 2 === 0 ? -1 : 1) * (W + GAP) / 2, y: (pos < 2 ? -1 : 1) * (H + GAP) / 2 - 20 };
    }

    private makePanel(pos: number): GameObjects.Container {
        const s = this.scene;
        const { x, y } = this.slot(pos);
        const panel = s.add.container(x, y).setName(`panel-${pos}`);
        const bg = s.add.rectangle(0, 0, W, H, GREY).setStrokeStyle(8, 0x333333).setName('bg').setInteractive({ useHandCursor: true });
        const label = s.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '30px', color: '#ffffff', align: 'center', wordWrap: { width: W - 40 }, stroke: '#000000', strokeThickness: 4 })
            .setOrigin(0.5).setName('label');
        panel.add([bg, label]);
        bg.on('pointerdown', (p: Input.Pointer) => this.onDown(pos, p));
        this.container.add(panel);
        this.paint(pos, panel);
        return panel;
    }

    /** Right place → its own colour and a coloured frame; wrong place → grey. */
    private paint(pos: number, panel = this.panels[pos]): void {
        const n = this.state.order[pos];
        const ok = panelCorrect(this.state, pos);
        (panel.getByName('bg') as GameObjects.Rectangle).setFillStyle(ok ? COLORS[n - 1] : GREY).setStrokeStyle(8, ok ? 0xffffff : 0x333333);
        (panel.getByName('label') as GameObjects.Text).setText(getGameData()?.texts.t(`l06.panel.${n}`) ?? '');
    }

    private onDown(pos: number, p: Input.Pointer): void {
        if (this.locked) return;
        const panel = this.panels[pos];
        this.dragging = { pos, dx: p.worldX - this.container.x - panel.x, dy: p.worldY - this.container.y - panel.y };
        this.container.bringToTop(panel);
    }

    private onMove(p: Input.Pointer): void {
        if (!this.dragging) return;
        const panel = this.panels[this.dragging.pos];
        panel.setPosition(p.worldX - this.container.x - this.dragging.dx, p.worldY - this.container.y - this.dragging.dy);
    }

    private onUp(p: Input.Pointer): void {
        const d = this.dragging;
        if (!d) return;
        this.dragging = null;
        const lx = p.worldX - this.container.x;
        const ly = p.worldY - this.container.y;
        let target = -1;
        for (let pos = 0; pos < 4; pos++) {
            const c = this.slot(pos);
            if (Math.abs(lx - c.x) <= W / 2 && Math.abs(ly - c.y) <= H / 2) target = pos;
        }
        if (target >= 0 && target !== d.pos) {
            this.state = swapPanels(this.state, d.pos, target);
            this.services.sfx('sfx_page_swap');
        }
        for (let pos = 0; pos < 4; pos++) {
            const c = this.slot(pos);
            this.panels[pos].setPosition(c.x, c.y);
            this.paint(pos);
        }
        if (this.state.solved) this.celebrate();
    }

    /** The page comes alive panel by panel, «ВЖУХ!», then the screen closes. */
    private celebrate(): void {
        this.locked = true;
        this.services.sfx('sfx_solve');
        this.panels.forEach((panel, i) => {
            this.scene.tweens.add({ targets: panel, scale: 1.08, duration: 180, yoyo: true, delay: i * 250 });
        });
        this.scene.time.delayedCall(1100, () => {
            const wow = this.scene.add.text(0, 0, getGameData()?.texts.t('l06.comic.wow') ?? '!', {
                fontFamily: 'Impact, sans-serif', fontSize: '140px', color: '#ffeb3b', stroke: '#d84315', strokeThickness: 14,
            }).setOrigin(0.5).setAngle(-8);
            this.container.add(wow);
            this.services.sfx('sfx_whoosh');
            this.scene.tweens.add({ targets: wow, scale: { from: 0.3, to: 1 }, duration: 300, ease: 'Back.easeOut' });
            this.scene.time.delayedCall(900, () => this.solve());
        });
    }
}
