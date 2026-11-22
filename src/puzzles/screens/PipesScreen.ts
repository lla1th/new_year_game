import type { GameObjects } from 'phaser';
import { getGameData } from '../../game/data/gameData';
import { OverlayScreen } from '../../game/scenes/OverlayScene';
import { computeFlow, createPipes, rotateTile, wrongReferenceTiles, type PipesState } from '../logic/pipes';

const TILE = 150;
const EMPTY = 0x9e9e9e;
const GLAZE = 0xff80ab;
const ORIGIN_X = -1.5 * TILE;
const ORIGIN_Y = -1.5 * TILE - 30;

/** P-04 close-up: 4×4 pipes between the tank (left) and the conveyor (right). */
export class PipesScreen extends OverlayScreen {
    state: PipesState = createPipes();
    /** Hint step 3: highlight reference tiles that are rotated wrong. */
    showHint = false;
    private tiles: GameObjects.Container[][] = [];
    private pipes: GameObjects.Graphics[][] = [];
    private frames: GameObjects.Rectangle[][] = [];
    private animating = 0;

    isSolved(): boolean { return this.state.solved; }

    create(container: GameObjects.Container): void {
        const s = this.scene;
        this.animating = 0;
        container.add(s.add.rectangle(ORIGIN_X - TILE, ORIGIN_Y, 110, 160, 0x6d4c41).setStrokeStyle(4, 0x3e2723));   // tank
        container.add(s.add.rectangle(ORIGIN_X + 4 * TILE, ORIGIN_Y + 3 * TILE, 110, 60, 0x455a64).setStrokeStyle(4, 0x263238));   // conveyor
        this.tiles = [];
        this.pipes = [];
        this.frames = [];
        for (let r = 0; r < 4; r++) {
            this.tiles.push([]); this.pipes.push([]); this.frames.push([]);
            for (let c = 0; c < 4; c++) {
                const x = ORIGIN_X + c * TILE;
                const y = ORIGIN_Y + r * TILE;
                const frame = s.add.rectangle(x, y, TILE - 6, TILE - 6, 0x263238).setStrokeStyle(4, 0x37474f).setInteractive({ useHandCursor: true });
                frame.on('pointerdown', () => this.rotate(c, r));
                const tile = s.add.container(x, y).setAngle(this.state.rot[r][c] * 90);
                const g = s.add.graphics();
                tile.add(g).setName(`pipe-${c}-${r}`);
                container.add([frame, tile]);
                this.tiles[r].push(tile); this.pipes[r].push(g); this.frames[r].push(frame);
            }
        }
        const label = getGameData()?.texts.t('ui.reset') ?? 'Reset';
        const reset = s.add.text(0, 360, label, { fontFamily: 'sans-serif', fontSize: '36px', color: '#ffffff', backgroundColor: '#3a2d5a', padding: { x: 24, y: 8 } })
            .setOrigin(0.5).setInteractive({ useHandCursor: true }).setName('pipes-reset');
        reset.on('pointerdown', () => this.reset());
        container.add(reset);
        this.paint();
    }

    /** Draws every pipe in its base (rotation 0) shape; the container angle turns it. Filled pipes get glaze. */
    private paint(): void {
        const flow = computeFlow(this.state);
        const wrong = new Set(this.showHint ? wrongReferenceTiles(this.state).map(([c, r]) => `${c},${r}`) : []);
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const g = this.pipes[r][c];
                const color = flow.filled[r][c] ? GLAZE : EMPTY;
                g.clear();
                g.lineStyle(34, color, 1);
                g.beginPath();
                if (this.state.types[r][c] === 'I') {
                    g.moveTo(-TILE / 2, 0); g.lineTo(TILE / 2, 0);          // left–right
                } else {
                    g.moveTo(0, -TILE / 2); g.lineTo(0, 0); g.lineTo(TILE / 2, 0);   // up–right
                }
                g.strokePath();
                g.fillStyle(color, 1);
                g.fillCircle(0, 0, 17);
                this.frames[r][c].setStrokeStyle(4, wrong.has(`${c},${r}`) ? 0xffeb3b : flow.filled[r][c] ? 0xf48fb1 : 0x37474f);
            }
        }
    }

    private rotate(c: number, r: number): void {
        if (this.state.solved) return;   // tiles are locked after success
        this.state = rotateTile(this.state, c, r);
        this.services.sfx('sfx_pipe_rotate');
        this.animating++;
        const tile = this.tiles[r][c];
        this.scene.tweens.add({
            targets: tile, angle: tile.angle + 90, duration: 150,
            onComplete: () => { tile.setAngle(this.state.rot[r][c] * 90); this.animating--; },
        });
        this.paint();
        if (computeFlow(this.state).reachesOutlet) {
            this.state = { ...this.state, solved: true };
            this.services.sfx('sfx_glaze_flow');
            this.scene.time.delayedCall(800, () => this.solve());
        }
    }

    private reset(): void {
        if (this.state.solved) return;
        this.state = createPipes();
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) this.tiles[r][c].setAngle(this.state.rot[r][c] * 90);
        this.paint();
    }
}
