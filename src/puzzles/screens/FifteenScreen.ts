import type { GameObjects } from 'phaser';
import { getGameData } from '../../game/data/gameData';
import { isDebug } from '../../game/debug';
import { isPlaceholder } from '../../game/assets/placeholder';
import { characterName } from '../../game/scenes/LevelScene';
import { OverlayScreen } from '../../game/scenes/OverlayScene';
import { HELP_DELAY_MS, HelpTimer, canMove, isSolved as boardSolved, moveTile, shuffleBoard, solveBoard, type Board } from '../logic/fifteen';

const TILE = 220;
const BOARD = TILE * 3;
const BOARD_X = -120;
const BOARD_Y = -30;
const SLIDE_MS = 120;
const AUTO_MS = 250;
const PICTURE = 'p08_picture';
const REAL_PICTURE = 'fin_p08_picture';

/** Real time: the overlay scene (and its clock) is recreated on every opening. */
const wallClock = () => performance.now();

/** Debug: `?debug=1&helpMs=3000` shortens the 5-minute help delay. */
function helpDelay(): number {
    if (!isDebug() || typeof location === 'undefined') return HELP_DELAY_MS;
    const v = Number(new URLSearchParams(location.search).get('helpMs'));
    return Number.isFinite(v) && v > 0 ? v : HELP_DELAY_MS;
}

/** P-08 close-up: the gift box lock — a 3×3 sliding puzzle with auto-solve help. */
export class FifteenScreen extends OverlayScreen {
    board: Board = shuffleBoard();
    solved = false;
    timer: HelpTimer | null = null;
    private container: GameObjects.Container;
    private tiles = new Map<number, GameObjects.Image>();
    private busy = false;            // a tile is sliding
    private auto = false;            // auto-solve is playing: player clicks are ignored
    private helpUi: GameObjects.GameObject[] = [];

    isSolved(): boolean { return this.solved; }

    /** Hint step 3: offer the auto-solve right away (now or when the screen is opened next). */
    offerHelpNow(): void {
        if (!this.timer) this.timer = new HelpTimer(wallClock, helpDelay());
        this.timer.offerNow();
    }

    create(container: GameObjects.Container): void {
        const s = this.scene;
        this.container = container;
        this.busy = false;
        this.auto = false;
        this.helpUi = [];
        this.ensurePicture();
        if (!this.timer) this.timer = new HelpTimer(wallClock, helpDelay());   // counts from the first opening
        else this.timer.reopen();   // an unanswered / interrupted offer comes back
        container.add(s.add.rectangle(BOARD_X, BOARD_Y, BOARD + 16, BOARD + 16, 0x5d4037).setStrokeStyle(6, 0xffd54f));
        this.tiles.clear();
        this.board.forEach((v, i) => { if (v !== 0) this.addTile(v, i); });
        // preview of the assembled picture, always visible
        container.add(s.add.image(400, -230, PICTURE, '__BASE').setScale(0.36).setName('preview'));
        const t = (k: string) => getGameData()?.texts.t(k) ?? k;
        const reshuffle = s.add.text(400, 40, t('ui.reshuffle'), { fontFamily: 'sans-serif', fontSize: '30px', color: '#ffffff', backgroundColor: '#3a2d5a', padding: { x: 16, y: 8 }, align: 'center', wordWrap: { width: 300 } })
            .setOrigin(0.5).setInteractive({ useHandCursor: true }).setName('reshuffle');
        reshuffle.on('pointerdown', () => this.reshuffle());
        container.add(reshuffle);
        s.time.addEvent({ delay: 1000, loop: true, callback: () => this.checkHelp() });
        if (this.solved) this.showSolved();
    }

    private ensurePicture(): void {
        const s = this.scene;
        if (s.textures.exists(PICTURE)) return;
        // The real picture (900×900, ASSET_REQUIREMENTS §2) is cut into 9 frames; otherwise a placeholder is drawn.
        if (s.textures.exists(REAL_PICTURE) && !isPlaceholder(REAL_PICTURE)) {
            const src = s.textures.get(REAL_PICTURE).getSourceImage() as HTMLImageElement;
            const tex = s.textures.createCanvas(PICTURE, TILE * 3, TILE * 3);
            if (tex) {
                tex.context.drawImage(src, 0, 0, TILE * 3, TILE * 3);
                for (let v = 1; v <= 9; v++) tex.add(String(v), 0, ((v - 1) % 3) * TILE, Math.floor((v - 1) / 3) * TILE, TILE, TILE);
                tex.refresh();
                return;
            }
        }
        const size = TILE * 3;
        const tex = s.textures.createCanvas(PICTURE, size, size);
        if (!tex) return;
        const ctx = tex.context;
        const grad = ctx.createLinearGradient(0, 0, 0, size);
        grad.addColorStop(0, '#1a237e'); grad.addColorStop(1, '#880e4f');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, size, size);
        // clock, the three heroes — placeholder shapes until the real picture (M4)
        ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(size / 2, size * 0.28, size * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(size / 2, size * 0.28); ctx.lineTo(size / 2, size * 0.16); ctx.moveTo(size / 2, size * 0.28); ctx.lineTo(size * 0.6, size * 0.28); ctx.stroke();
        const people: [string, string, number][] = [['ksyusha', '#ce93d8', 0.2], ['spitz', '#ff8a65', 0.5], ['cat', '#a1887f', 0.8]];
        ctx.textAlign = 'center'; ctx.font = 'bold 34px sans-serif';
        for (const [id, color, x] of people) {
            ctx.fillStyle = color; ctx.fillRect(size * x - 70, size * 0.55, 140, 200);
            ctx.fillStyle = '#ffffff'; ctx.fillText(characterName(id as 'ksyusha'), size * x, size * 0.55 + 110, 150);
        }
        for (let v = 1; v <= 9; v++) {
            const i = v - 1;
            tex.add(String(v), 0, (i % 3) * TILE, Math.floor(i / 3) * TILE, TILE, TILE);
        }
        tex.refresh();
    }

    private cell(i: number): { x: number; y: number } {
        return { x: BOARD_X + ((i % 3) - 1) * TILE, y: BOARD_Y + (Math.floor(i / 3) - 1) * TILE };
    }

    private addTile(v: number, i: number): void {
        const { x, y } = this.cell(i);
        const img = this.scene.add.image(x, y, PICTURE, String(v)).setDisplaySize(TILE - 4, TILE - 4).setInteractive({ useHandCursor: true }).setName(`tile-${v}`);
        img.on('pointerdown', () => this.click(v));
        this.container.add(img);
        this.tiles.set(v, img);
    }

    private click(v: number): void {
        if (this.auto || this.busy || this.solved) return;   // ignored during auto-solve
        this.slide(this.board.indexOf(v));
    }

    private slide(idx: number, then?: () => void): void {
        const v = this.board[idx];
        const img = this.tiles.get(v);
        if (!img) return;
        if (!canMove(this.board, idx)) {
            this.scene.tweens.add({ targets: img, angle: { from: -4, to: 4 }, duration: 60, yoyo: true, repeat: 1, onComplete: () => img.setAngle(0) });   // gentle wobble
            return;
        }
        const to = this.cell(this.board.indexOf(0));
        this.board = moveTile(this.board, idx);
        this.services.sfx('sfx_tile_slide');
        this.busy = true;
        this.scene.tweens.add({
            targets: img, x: to.x, y: to.y, duration: SLIDE_MS,
            onComplete: () => {
                this.busy = false;
                if (boardSolved(this.board)) this.finish();
                then?.();
            },
        });
    }

    private reshuffle(): void {
        if (this.auto || this.busy || this.solved) return;
        this.board = shuffleBoard();   // the help timer is NOT reset
        this.board.forEach((v, i) => { if (v !== 0) { const c = this.cell(i); this.tiles.get(v)?.setPosition(c.x, c.y); } });
    }

    private checkHelp(): void {
        if (this.auto || this.solved || !this.timer || !this.timer.shouldOffer()) return;
        void this.services.say('spitz', 'l08.puzzle.help').then(() => this.showHelpButtons());
    }

    private showHelpButtons(): void {
        if (this.solved || !this.container.active) return;
        const s = this.scene;
        const t = (k: string) => getGameData()?.texts.t(k) ?? k;
        const mk = (label: string, x: number, name: string, fn: () => void) => {
            const b = s.add.text(x, 330, label, { fontFamily: 'sans-serif', fontSize: '34px', color: '#ffffff', backgroundColor: '#2e7d32', padding: { x: 24, y: 8 } })
                .setOrigin(0.5).setInteractive({ useHandCursor: true }).setName(name);
            b.on('pointerdown', () => { this.clearHelp(); fn(); });
            this.container.add(b);
            this.helpUi.push(b);
        };
        mk(t('ui.help.yes'), -220, 'help-yes', () => this.autoSolve());
        mk(t('ui.help.no'), 0, 'help-no', () => this.timer?.decline());
    }

    private clearHelp(): void {
        for (const o of this.helpUi) o.destroy();
        this.helpUi = [];
    }

    /** «Да»: the solution is played move by move, 250 ms per move; player clicks are off meanwhile. */
    private autoSolve(): void {
        if (this.solved) return;
        // the timer stays 'waiting' during the auto-solve: if the screen is closed midway, reopening offers help again
        this.auto = true;
        const moves = solveBoard(this.board);
        const step = (k: number) => {
            if (this.solved || k >= moves.length) return;
            this.slide(moves[k]);
            this.scene.time.delayedCall(AUTO_MS, () => step(k + 1));
        };
        step(0);
    }

    /** The last piece fills the empty cell, the box opens. */
    private finish(): void {
        this.solved = true;
        this.auto = false;
        this.clearHelp();
        this.showSolved();
        this.services.sfx('sfx_box_open');
        this.scene.time.delayedCall(900, () => this.solve());
    }

    private showSolved(): void {
        const c = this.cell(8);
        const last = this.scene.add.image(c.x, c.y, PICTURE, '9').setDisplaySize(TILE - 4, TILE - 4).setAlpha(0);
        this.container.add(last);
        this.scene.tweens.add({ targets: last, alpha: 1, duration: 400 });
    }
}
