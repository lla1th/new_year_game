import { Scene, type GameObjects } from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../data/types';
import { isPlaceholder } from '../assets/placeholder';
import type { Vec2 } from '../nav/geometry';

export const BRUSH_STROKES = 11;
export const STROKE_MS = 200;      // 11 × 0.2 s ≈ 2.2 s + loading ≈ 2.5 s (ART_BIBLE: 2–3 s)
const OLD_KEY = 'transition_old_frame';
const BRUSH_KEY = 'transition_brush';

export interface TransitionData {
    /** The old frame (renderer snapshot). */
    image: HTMLImageElement;
    /** Ksyusha / spitz stay where they were on screen during the transition. */
    actors: { texture: string; flipX: boolean; scale: number; pos: Vec2 }[];
}

/**
 * «Перерисовка кистью» (ART_BIBLE): the old frame lies on top as a RenderTexture and is erased stroke by stroke,
 * revealing the new world loaded underneath. Swallows all input until it is done.
 */
export class TransitionScene extends Scene {
    private rt: GameObjects.RenderTexture;
    private actors: GameObjects.Image[] = [];

    constructor() {
        super('TransitionScene');
    }

    create(data: TransitionData) {
        // full-screen blocker: clicks never reach the scene below while the transition runs
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.001).setOrigin(0, 0).setInteractive();
        if (this.textures.exists(OLD_KEY)) this.textures.remove(OLD_KEY);
        this.textures.addImage(OLD_KEY, data.image);
        this.rt = this.add.renderTexture(0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0, 0);
        const old = this.add.image(0, 0, OLD_KEY).setOrigin(0, 0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
        this.rt.draw(old);
        this.rt.render();
        old.destroy();
        this.actors = data.actors.map(a => this.add.image(a.pos.x, a.pos.y, a.texture).setOrigin(0.5, 1).setFlipX(a.flipX).setScale(a.scale));
        this.ensureBrush();
    }

    /** A soft-edged brush stroke (used when the author's brush_NN pictures are not there). */
    private ensureBrush(): void {
        if (this.textures.exists(BRUSH_KEY)) return;
        const w = 900;
        const h = 340;
        const tex = this.textures.createCanvas(BRUSH_KEY, w, h);
        if (!tex) return;
        const ctx = tex.context;
        ctx.fillStyle = '#000';
        for (let i = 0; i < 260; i++) {   // bristles: many overlapping blobs along a curve
            const t = i / 260;
            const x = 60 + t * (w - 120);
            const y = h / 2 + Math.sin(t * Math.PI * 1.5) * 50 + (Math.random() - 0.5) * 70;
            const r = 40 + Math.random() * 45;
            ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, Math.random(), 0, Math.PI * 2); ctx.fill();
        }
        tex.refresh();
    }

    /** Erases the old frame stroke by stroke; resolves when the new world is fully shown. */
    /** Game-clock duration of the last reveal (ms), for checks. */
    lastRevealMs = 0;

    reveal(): Promise<void> {
        const t0 = this.time.now;
        return new Promise(resolve => {
            const custom = Array.from({ length: 12 }, (_, i) => `brush_${String(i + 1).padStart(2, '0')}`)
                .filter(k => this.textures.exists(k) && !isPlaceholder(k));
            let i = 0;
            const step = () => {
                if (i >= BRUSH_STROKES) {
                    this.rt.clear();
                    this.rt.render();
                    this.lastRevealMs = this.time.now - t0;
                    resolve();
                    return;
                }
                const brush = custom.length
                    ? this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, custom[i % custom.length]).setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                    : this.add.image(
                        ((i * 0.37) % 1) * GAME_WIDTH, (i / (BRUSH_STROKES - 1)) * GAME_HEIGHT, BRUSH_KEY,
                    ).setScale(1.6 + (i % 3) * 0.3).setAngle(-25 + (i * 47) % 50);
                this.rt.erase(brush);
                this.rt.render();
                brush.destroy();
                i++;
                this.time.delayedCall(STROKE_MS, step);
            };
            step();
        });
    }

    /** The actors move to their places in the new world, then the scene ends. */
    finish(targets: Vec2[]): Promise<void> {
        return new Promise(resolve => {
            if (this.actors.length === 0) { this.scene.stop(); resolve(); return; }
            this.actors.forEach((a, k) => {
                const t = targets[k] ?? { x: a.x, y: a.y };
                this.tweens.add({ targets: a, x: t.x, y: t.y, duration: 300 });
            });
            this.time.delayedCall(320, () => { this.scene.stop(); resolve(); });
        });
    }
}
