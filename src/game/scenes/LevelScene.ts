import { Scene, type GameObjects, type Input, type Tweens } from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, type Facing } from '../data/types';
import { ensureTexture } from '../assets/placeholder';
import { isDebug } from '../debug';
import { parseTiledMap, type LevelMap } from '../map/parseTiledMap';
import { NavGrid } from '../nav/NavGrid';
import { facingFromVector } from '../nav/facing';
import type { Vec2 } from '../nav/geometry';

/** Rejection reason of walkTo() when the walk is replaced by a new one. */
export class WalkInterruptedError extends Error {
    constructor () {
        super('walk interrupted');
        this.name = 'WalkInterruptedError';
    }
}

export interface LevelSceneData { mapPath: string }

const WALK_SPEED = 300;        // px/s in 1920×1080 coordinates
const BOB_HEIGHT = 6;          // px
const BOB_PERIOD_MS = 350;
const TILT_DEG = 3;
const KSYUSHA_W = 90;
const KSYUSHA_H = 360;
const SPRITE_PLACEHOLDER_W = 64;
const SPRITE_PLACEHOLDER_H = 128;
const DEBUG_DEPTH = 1_000_000;

export class LevelScene extends Scene
{
    private mapPath = '';
    private mapKey = '';
    private map: LevelMap;
    private nav: NavGrid;

    private ksyusha: GameObjects.Image;
    private pos: Vec2 = { x: 0, y: 0 };
    private facing: Facing = 'dr';

    /** Current pose direction (M1 uses it to turn towards hotspots). */
    get currentFacing (): Facing { return this.facing; }

    /** Current position of Ksyusha's feet (copy). */
    get position (): Vec2 { return { x: this.pos.x, y: this.pos.y }; }

    get isWalking (): boolean { return this.walk !== null; }

    private path: Vec2[] = [];
    private walk: { resolve: () => void; reject: (e: Error) => void } | null = null;
    private bob = { y: 0, angle: 0 };
    private bobTweens: Tweens.Tween[] = [];

    private debugGfx: GameObjects.Graphics | null = null;

    constructor ()
    {
        super('LevelScene');
    }

    init (data: Partial<LevelSceneData>)
    {
        this.mapPath = data.mapPath ?? 'assets/maps/test.json';
        this.mapKey = `map:${this.mapPath}`;
        this.path = [];
        this.walk = null;
        this.bobTweens = [];
        this.debugGfx = null;
    }

    preload ()
    {
        this.load.on('loaderror', (file: { key: string; src?: string }) => {
            console.warn(`[LevelScene] failed to load "${file.key}" (${file.src ?? ''}), using placeholder`);
        });
        if (!this.cache.json.exists(this.mapKey)) this.load.json(this.mapKey, this.mapPath);
        this.load.once(`filecomplete-json-${this.mapKey}`, (_key: string, _type: string, data: unknown) => {
            try {
                const bg = parseTiledMap(data).background;
                if (!this.textures.exists(this.backgroundKey(bg))) this.load.image(this.backgroundKey(bg), `assets/${bg}`);
            } catch {
                // reported in create()
            }
        });
    }

    create ()
    {
        this.map = parseTiledMap(this.cache.json.get(this.mapKey));
        this.nav = new NavGrid(this.map.walkable, this.map.blockers, 16, GAME_WIDTH, GAME_HEIGHT);

        const bgKey = ensureTexture(this, this.backgroundKey(this.map.background), GAME_WIDTH, GAME_HEIGHT, this.map.background);
        this.add.image(0, 0, bgKey).setOrigin(0, 0).setDepth(-1);

        for (const s of this.map.sprites) {
            const key = ensureTexture(this, s.texture, SPRITE_PLACEHOLDER_W, SPRITE_PLACEHOLDER_H, s.name);
            this.add.image(s.pos.x, s.pos.y, key).setOrigin(0.5, 1).setDepth(s.depthY);
        }

        ensureTexture(this, 'ksyusha_dr_idle', KSYUSHA_W, KSYUSHA_H, 'Ксюша');
        ensureTexture(this, 'ksyusha_ur_idle', KSYUSHA_W, KSYUSHA_H, 'Ксюша');
        const spawn = this.map.points.spawn ?? this.nav.nearestWalkable({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 }) ?? { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
        this.pos = { x: spawn.x, y: spawn.y };
        this.ksyusha = this.add.image(this.pos.x, this.pos.y, 'ksyusha_dr_idle').setOrigin(0.5, 1);
        this.setFacing('dr');

        this.input.on('pointerdown', (pointer: Input.Pointer) => {
            this.walkTo({ x: pointer.worldX, y: pointer.worldY }).catch((e: unknown) => {
                if (!(e instanceof WalkInterruptedError)) throw e;
            });
        });

        if (isDebug()) {
            this.debugGfx = this.add.graphics().setDepth(DEBUG_DEPTH);
            this.drawDebug();
            // Debug-only handle for automated browser checks.
            (window as unknown as { __levelScene?: LevelScene }).__levelScene = this;
        }

        this.events.once('shutdown', () => this.cancelWalk());
        this.syncSprite();
    }

    /**
     * Walks Ksyusha to `target` (or to the nearest walkable point).
     * Resolves on arrival; rejects with WalkInterruptedError if a new walk replaces this one.
     */
    walkTo (target: Vec2): Promise<void>
    {
        this.cancelWalk();
        const path = this.nav.findPath(this.pos, target);
        this.path = path;
        this.drawDebug();
        if (path.length === 0) {
            this.stopBob();
            return Promise.resolve();
        }
        return new Promise<void>((resolve, reject) => {
            this.walk = { resolve, reject };
            this.startBob();
            this.faceTowards(path[0]);
        });
    }

    update (_time: number, delta: number)
    {
        if (this.path.length > 0) {
            let budget = (WALK_SPEED * delta) / 1000;
            while (budget > 0 && this.path.length > 0) {
                const next = this.path[0];
                const dx = next.x - this.pos.x;
                const dy = next.y - this.pos.y;
                const dist = Math.hypot(dx, dy);
                if (dist <= budget) {
                    this.pos = { x: next.x, y: next.y };
                    budget -= dist;
                    this.path.shift();
                    if (this.path.length > 0) this.faceTowards(this.path[0]);
                } else {
                    this.pos = { x: this.pos.x + (dx / dist) * budget, y: this.pos.y + (dy / dist) * budget };
                    budget = 0;
                }
            }
            if (this.path.length === 0) this.finishWalk();
            if (this.debugGfx) this.drawDebug();
        }
        this.syncSprite();
    }

    // --- internals -------------------------------------------------------

    private backgroundKey (path: string): string
    {
        return `bg:${path}`;
    }

    private finishWalk ()
    {
        this.stopBob();
        const w = this.walk;
        this.walk = null;
        w?.resolve();
    }

    private cancelWalk ()
    {
        this.path = [];
        const w = this.walk;
        this.walk = null;
        w?.reject(new WalkInterruptedError());
    }

    private startBob ()
    {
        if (this.bobTweens.length > 0) return;   // keep swaying smoothly when the target changes mid-walk
        this.bob.y = 0;
        this.bob.angle = -TILT_DEG;
        this.bobTweens = [
            this.tweens.add({ targets: this.bob, y: -BOB_HEIGHT, duration: BOB_PERIOD_MS / 2, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 }),
            this.tweens.add({ targets: this.bob, angle: TILT_DEG, duration: BOB_PERIOD_MS, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 }),
        ];
    }

    private stopBob ()
    {
        for (const t of this.bobTweens) t.stop();
        this.bobTweens = [];
        this.bob.y = 0;
        this.bob.angle = 0;
    }

    private faceTowards (p: Vec2)
    {
        const dx = p.x - this.pos.x;
        const dy = p.y - this.pos.y;
        if (dx === 0 && dy === 0) return;
        this.setFacing(facingFromVector(dx, dy));
    }

    private setFacing (f: Facing)
    {
        this.facing = f;
        const up = f === 'ur' || f === 'ul';
        this.ksyusha.setTexture(up ? 'ksyusha_ur_idle' : 'ksyusha_dr_idle');
        this.ksyusha.setFlipX(f === 'dl' || f === 'ul');   // left poses mirror the right ones
    }

    private syncSprite ()
    {
        this.ksyusha.setPosition(this.pos.x, this.pos.y + this.bob.y);
        this.ksyusha.setAngle(this.bob.angle);
        this.ksyusha.setDepth(this.pos.y);
    }

    private drawDebug ()
    {
        const g = this.debugGfx;
        if (!g) return;
        g.clear();
        g.fillStyle(0x00ff00, 0.25);
        for (const poly of this.map.walkable) { tracePath(g, poly, true); g.fillPath(); }
        g.fillStyle(0xff0000, 0.35);
        for (const poly of this.map.blockers) { tracePath(g, poly, true); g.fillPath(); }
        g.fillStyle(0xffff00, 0.3);
        g.lineStyle(2, 0xffff00, 0.9);
        for (const h of this.map.hotspots) {
            tracePath(g, h.shape, true);
            g.fillPath();
            g.strokePath();
            g.fillCircle(h.approach.x, h.approach.y, 6);
        }
        if (this.path.length > 0) {
            g.lineStyle(4, 0x00ffff, 1);
            tracePath(g, [this.pos, ...this.path], false);
            g.strokePath();
            g.fillStyle(0x00ffff, 1);
            for (const p of this.path) g.fillCircle(p.x, p.y, 5);
        }
    }
}

function tracePath (g: GameObjects.Graphics, pts: readonly Vec2[], close: boolean): void
{
    g.beginPath();
    pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    if (close) g.closePath();
}
