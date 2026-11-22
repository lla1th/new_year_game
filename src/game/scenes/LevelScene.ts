import { Scene, type GameObjects, type Input, type Tweens } from 'phaser';
import { bus } from '../../events';
import { GAME_HEIGHT, GAME_WIDTH, type Facing, type ItemId, type LevelId, type PuzzleId, type SpeakerId } from '../data/types';
import { ensureTexture } from '../assets/placeholder';
import { getGameData } from '../data/gameData';
import { isDebug } from '../debug';
import { parseTiledMap, type HotspotDef, type LevelMap } from '../map/parseTiledMap';
import { NavGrid } from '../nav/NavGrid';
import { facingFromVector } from '../nav/facing';
import { distance, type Vec2 } from '../nav/geometry';
import { ScriptRunner, type ScriptContext } from '../script/ScriptRunner';
import type { HotspotScript, LevelScript, ScreenScript, Step } from '../script/types';
import { HintSystem } from '../systems/HintSystem';
import { hitTestHotspots, isHotspotActive } from '../systems/hotspots';
import { gameState } from '../../state/gameState';
import { saveGame } from '../../state/SaveService';
import { getAnim, getCutscene, getLevelVisual } from './registry';

/** Rejection reason of walkTo() when the walk is replaced by a new one. */
export class WalkInterruptedError extends Error {
    constructor () {
        super('walk interrupted');
        this.name = 'WalkInterruptedError';
    }
}

export interface LevelSceneData { script?: LevelScript; screen?: string }

/** Resolves a level script by id (set by the app; avoids an import cycle with levels/index). */
export type LevelResolver = (level: LevelId) => LevelScript | undefined;

const WALK_SPEED = 300;        // px/s in 1920×1080 coordinates
const BOB_HEIGHT = 6;          // px
const BOB_PERIOD_MS = 350;
const TILT_DEG = 3;
const USE_POSE_MS = 300;
const LONG_PRESS_MS = 500;
const HIGHLIGHT_MS = 2000;
const SPITZ_FOLLOW_DIST = 80;
const KSYUSHA_W = 90;
const KSYUSHA_H = 360;
const SPITZ_W = 120;
const SPITZ_H = 90;
const SPRITE_PLACEHOLDER_W = 64;
const SPRITE_PLACEHOLDER_H = 128;
const OUTLINE_DEPTH = 900_000;
const DEBUG_DEPTH = 1_000_000;

export class LevelScene extends Scene
{
    static resolveLevel: LevelResolver = () => undefined;

    private pendingStart: LevelSceneData = {};

    // level
    private script: LevelScript | null = null;
    private screenId = '';
    private screen: ScreenScript | null = null;
    map: LevelMap;
    nav: NavGrid;
    private sprites = new Map<string, GameObjects.Image>();
    private runner: ScriptRunner;
    hints: HintSystem | null = null;
    private loading = false;
    private levelGeneration = 0;

    // characters
    ksyusha: GameObjects.Image;
    spitz: GameObjects.Image | null = null;
    private pos: Vec2 = { x: 0, y: 0 };
    private facing: Facing = 'dr';
    private pose: 'idle' | 'use' = 'idle';
    private trail: Vec2[] = [];

    // walking
    private path: Vec2[] = [];
    private walk: { resolve: () => void; reject: (e: Error) => void } | null = null;
    private bob = { y: 0, angle: 0 };
    private bobTweens: Tweens.Tween[] = [];

    // interaction
    private busy = false;               // a hotspot action is running (walking to it or its script)
    private scriptPhase = false;        // the script part of an action / onEnter / cutscene is running
    private talking = 0;                // say/dialog in progress
    private hoverId: string | null = null;
    private cursorKind = 'default';
    private highlightUntil = 0;
    private lastWrongKey: string | undefined;
    private touch: { pt: Vec2; timer: { remove: () => void } } | null = null;
    private outlineGfx: GameObjects.Graphics;
    private debugGfx: GameObjects.Graphics | null = null;
    private offBus: (() => void)[] = [];

    constructor ()
    {
        super('LevelScene');
    }

    // --- public API -------------------------------------------------------

    /** Current pose direction. */
    get currentFacing (): Facing { return this.facing; }

    /** Current position of Ksyusha's feet (copy). */
    get position (): Vec2 { return { x: this.pos.x, y: this.pos.y }; }

    get isWalking (): boolean { return this.walk !== null; }

    get isBusy (): boolean { return this.busy || this.scriptPhase || this.talking > 0 || this.loading; }

    get currentLevel (): LevelScript | null { return this.script; }

    get currentScreenId (): string { return this.screenId; }

    /** A sprite placed through the Tiled `sprites` layer, by its name. */
    getSprite (name: string): GameObjects.Image | undefined { return this.sprites.get(name); }

    /** Teleports Ksyusha (cutscenes / animations). */
    placeKsyusha (p: Vec2): void
    {
        this.cancelWalk();
        this.pos = { x: p.x, y: p.y };
        this.trail = [{ ...this.pos }];
        this.syncSprite();
    }

    setFacing (f: Facing): void
    {
        this.facing = f;
        this.applyTexture();
    }

    /** Shows (or creates) the spitz at `p` and makes him follow Ksyusha. */
    showSpitz (p: Vec2): GameObjects.Image
    {
        if (!this.spitz) {
            ensureTexture(this, 'spitz_dr_idle', SPITZ_W, SPITZ_H, 'Шпиц');
            this.spitz = this.add.image(p.x, p.y, 'spitz_dr_idle').setOrigin(0.5, 1);
        }
        this.spitz.setVisible(true).setPosition(p.x, p.y).setDepth(p.y);
        this.trail = [{ x: p.x, y: p.y }, { ...this.pos }];
        return this.spitz;
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

    /** Loads a level screen: map, background, characters; saves a checkpoint; then runs onEnter. */
    async loadLevel (script: LevelScript, screen?: string): Promise<void>
    {
        const screenId = screen ?? script.firstScreen;
        const screenScript = script.screens[screenId];
        if (!screenScript) throw new Error(`level ${script.levelId} has no screen "${screenId}"`);
        this.loading = true;
        this.levelGeneration++;
        try {
            this.cancelWalk();
            this.stopBob();
            this.tweens.killAll();
            this.children.removeAll(true);
            this.sprites.clear();
            this.spitz = null;
            this.busy = false;
            this.scriptPhase = false;
            this.hoverId = null;

            const mapKey = `map:${screenScript.map}`;
            await this.loadFiles(l => { if (!this.cache.json.exists(mapKey)) l.json(mapKey, screenScript.map); });
            this.map = parseTiledMap(this.cache.json.get(mapKey));
            this.nav = new NavGrid(this.map.walkable, this.map.blockers, 16, GAME_WIDTH, GAME_HEIGHT);
            const bgKey = `bg:${this.map.background}`;
            await this.loadFiles(l => { if (!this.textures.exists(bgKey)) l.image(bgKey, `assets/${this.map.background}`); });

            this.script = script;
            this.screenId = screenId;
            this.screen = screenScript;
            gameState.levelId = script.levelId;
            gameState.screenId = screen ?? null;
            this.buildScene(bgKey);
            this.hints = new HintSystem(script.goals, f => gameState.hasFlag(f), () => this.time.now);
        } finally {
            this.loading = false;
        }
        this.checkpoint();
        bus.emit('scene:ready', { levelId: script.levelId, screenId: screen ?? null });
        if (screenScript.onEnter?.length) void this.runScript(screenScript.onEnter);
    }

    /** Re-applies level visuals (call after state changes outside scripts). */
    refreshVisuals (): void
    {
        if (this.script) getLevelVisual(this.script.levelId)?.(this);
    }

    // --- Phaser lifecycle ---------------------------------------------------

    init (data: LevelSceneData)
    {
        this.pendingStart = data ?? {};
        this.path = [];
        this.walk = null;
        this.bobTweens = [];
        this.bob = { y: 0, angle: 0 };
        this.busy = false;
        this.scriptPhase = false;
        this.talking = 0;
        this.debugGfx = null;
        this.spitz = null;
        this.sprites = new Map();
    }

    create ()
    {
        this.runner = new ScriptRunner(this.makeContext());
        this.input.mouse?.disableContextMenu();
        this.input.on('pointerdown', (p: Input.Pointer) => this.onPointerDown(p));
        this.input.on('pointerup', (p: Input.Pointer) => this.onPointerUp(p));
        this.input.on('pointermove', (p: Input.Pointer) => this.onPointerMove(p));

        this.offBus.push(
            bus.on('item:drop', ({ itemId, x, y }) => this.onItemDrop(itemId, { x, y })),
            bus.on('highlight:all', () => { this.highlightUntil = this.time.now + HIGHLIGHT_MS; }),
            bus.on('hint:request', () => this.onHintRequest()),
            bus.on('item:combine', () => {
                // The only valid pair (L07) arrives in M3; everything else does not combine.
                if (!this.isBusy) void this.runScript([{ say: 'ksyusha', key: 'common.cantCombine' }]);
            }),
        );
        this.time.addEvent({ delay: 1000, loop: true, callback: () => this.onHintTick() });
        this.events.once('shutdown', () => {
            this.cancelWalk();
            this.stopBob();
            for (const off of this.offBus) off();
            this.offBus = [];
        });
        if (isDebug()) (window as unknown as { __levelScene?: LevelScene }).__levelScene = this;

        const start = this.pendingStart;
        if (start.script) void this.loadLevel(start.script, start.screen);
    }

    update (_time: number, delta: number)
    {
        if (!this.ksyusha) return;
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
                this.pushTrail();
            }
            if (this.path.length === 0) this.finishWalk();
            this.drawDebug();
        }
        this.syncSprite();
        this.updateSpitz();
        this.drawOutlines();
    }

    // --- building -----------------------------------------------------------

    private buildScene (bgKey: string)
    {
        ensureTexture(this, bgKey, GAME_WIDTH, GAME_HEIGHT, this.map.background);
        this.add.image(0, 0, bgKey).setOrigin(0, 0).setDepth(-1);
        for (const s of this.map.sprites) {
            const key = ensureTexture(this, s.texture, SPRITE_PLACEHOLDER_W, SPRITE_PLACEHOLDER_H, s.name);
            this.sprites.set(s.name, this.add.image(s.pos.x, s.pos.y, key).setOrigin(0.5, 1).setDepth(s.depthY));
        }
        for (const dir of ['dr', 'ur'] as const) {
            for (const pose of ['idle', 'use'] as const) ensureTexture(this, `ksyusha_${dir}_${pose}`, KSYUSHA_W, KSYUSHA_H, 'Ксюша');
        }
        const spawn = this.map.points.spawn ?? this.nav.nearestWalkable({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 }) ?? { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
        this.pos = { x: spawn.x, y: spawn.y };
        this.trail = [{ ...this.pos }];
        this.pose = 'idle';
        this.ksyusha = this.add.image(this.pos.x, this.pos.y, 'ksyusha_dr_idle').setOrigin(0.5, 1);
        this.setFacing('dr');
        this.outlineGfx = this.add.graphics().setDepth(OUTLINE_DEPTH);
        this.debugGfx = isDebug() ? this.add.graphics().setDepth(DEBUG_DEPTH) : null;
        if (gameState.hasFlag('L01_SPITZ_FREED')) {
            const sp = this.map.points.spitz_spawn ?? this.nav.nearestWalkable({ x: this.pos.x - SPITZ_FOLLOW_DIST, y: this.pos.y }) ?? this.pos;
            this.showSpitz(sp);
        }
        this.refreshVisuals();
        this.syncSprite();
        this.drawDebug();
    }

    private loadFiles (queue: (l: Phaser.Loader.LoaderPlugin) => void): Promise<void>
    {
        return new Promise(resolve => {
            queue(this.load);
            if (this.load.list.size === 0) { resolve(); return; }
            const onError = (file: { key: string; src?: string }) => {
                console.warn(`[LevelScene] failed to load "${file.key}" (${file.src ?? ''}), using placeholder`);
            };
            this.load.on('loaderror', onError);
            this.load.once('complete', () => { this.load.off('loaderror', onError); resolve(); });
            this.load.start();
        });
    }

    // --- input --------------------------------------------------------------

    private onPointerDown (p: Input.Pointer)
    {
        if (this.loading || !this.map) return;
        const pt = { x: p.worldX, y: p.worldY };
        if (p.rightButtonDown()) { this.inspectAt(pt); return; }
        if (p.wasTouch) {
            // Long tap = inspect, short tap = primary action (on release).
            this.touch?.timer.remove();
            const timer = this.time.delayedCall(LONG_PRESS_MS, () => { this.touch = null; this.inspectAt(pt); });
            this.touch = { pt, timer };
            return;
        }
        this.primaryAt(pt);
    }

    private onPointerUp (_p: Input.Pointer)
    {
        if (!this.touch) return;
        const { pt, timer } = this.touch;
        timer.remove();
        this.touch = null;
        this.primaryAt(pt);
    }

    private onPointerMove (p: Input.Pointer)
    {
        if (p.wasTouch || !this.map) return;
        const h = this.isBusy ? null : this.hotspotAt({ x: p.worldX, y: p.worldY });
        const id = h?.id ?? null;
        if (id !== this.hoverId) this.hoverId = id;
        const kind = h ? h.cursor : 'default';
        if (kind !== this.cursorKind) {
            this.cursorKind = kind;
            bus.emit('cursor', { kind });
        }
    }

    private hotspotAt (pt: Vec2): HotspotDef | null
    {
        return hitTestHotspots(this.map.hotspots, pt, f => gameState.hasFlag(f));
    }

    private primaryAt (pt: Vec2)
    {
        if (this.scriptPhase || this.talking > 0 || this.loading) return;
        const h = this.hotspotAt(pt);
        if (h) {
            if (this.busy) return;   // already acting on a hotspot: ignore repeated clicks
            void this.interact(h, { kind: 'use' });
            return;
        }
        // Floor: walk there (interrupts walking to a hotspot).
        this.walkTo(pt).catch(ignoreInterrupt);
    }

    private inspectAt (pt: Vec2)
    {
        if (this.busy || this.scriptPhase || this.talking > 0 || this.loading) return;
        const h = this.hotspotAt(pt);
        if (h) void this.interact(h, { kind: 'inspect' });
    }

    private onItemDrop (itemId: ItemId, pt: Vec2)
    {
        if (this.isBusy || !this.map) return;
        const h = this.hotspotAt(pt);
        if (!h) return;   // dropped on empty space: the item simply stays in its slot
        void this.interact(h, { kind: 'item', itemId });
    }

    // --- actions ------------------------------------------------------------

    private scriptFor (h: HotspotDef): HotspotScript | undefined
    {
        return this.screen ? this.runner.pickScript(this.screen.hotspots, h.id) : undefined;
    }

    private inspectSteps (h: HotspotDef, s: HotspotScript | undefined): Step[]
    {
        const lvl = (this.script?.levelId ?? 'L01').toLowerCase();
        return s?.onInspect ?? [{ say: 'ksyusha', key: `${lvl}.${h.id}.inspect` }];
    }

    private useSteps (h: HotspotDef, s: HotspotScript | undefined): Step[]
    {
        const steps = s?.onUse;
        if (!steps) return this.inspectSteps(h, s);
        // An item source works once: if its item is already in the inventory, only the inspect text remains.
        const given = steps.find((st): st is { giveItem: ItemId } => 'giveItem' in st);
        if (given && gameState.hasItem(given.giveItem)) return this.inspectSteps(h, s);
        return steps;
    }

    private itemSteps (s: HotspotScript | undefined, itemId: ItemId): Step[]
    {
        const steps = s?.onItem?.[itemId];
        if (steps) return steps;
        const tb = getGameData()?.texts;
        const key = tb ? tb.randomVariant('common.wrongItem', Math.random, this.lastWrongKey).key : 'common.wrongItem.1';
        this.lastWrongKey = key;
        return [{ say: 'ksyusha', key }];
    }

    private async interact (h: HotspotDef, a: { kind: 'use' } | { kind: 'inspect' } | { kind: 'item'; itemId: ItemId })
    {
        if (this.busy) return;
        this.busy = true;
        const gen = this.levelGeneration;
        try {
            const s = this.scriptFor(h);
            if (a.kind !== 'inspect') {
                try {
                    await this.walkTo(h.approach);
                } catch (e) {
                    if (e instanceof WalkInterruptedError) return;
                    throw e;
                }
                if (gen !== this.levelGeneration) return;
                this.setFacing(h.facing);
                await this.showPose('use', USE_POSE_MS);
            }
            const steps = a.kind === 'inspect' ? this.inspectSteps(h, s)
                : a.kind === 'use' ? this.useSteps(h, s)
                    : this.itemSteps(s, a.itemId);
            await this.runScript(steps);
        } finally {
            if (gen === this.levelGeneration) this.busy = false;
        }
    }

    /** Runs script steps with input locked. */
    async runScript (steps: Step[]): Promise<void>
    {
        const gen = this.levelGeneration;
        this.scriptPhase = true;
        try {
            await this.runner.run(steps);
        } catch (e) {
            console.error('[LevelScene] script failed', e);
        } finally {
            if (gen === this.levelGeneration) this.scriptPhase = false;
        }
    }

    private showPose (pose: 'idle' | 'use', ms: number): Promise<void>
    {
        this.pose = pose;
        this.applyTexture();
        return new Promise(resolve => this.time.delayedCall(ms, () => {
            this.pose = 'idle';
            this.applyTexture();
            resolve();
        }));
    }

    // --- script context -----------------------------------------------------

    private makeContext (): ScriptContext
    {
        return {
            state: gameState,
            say: (speaker, key) => this.say(speaker, key),
            dialog: id => this.dialog(id),
            anim: async name => {
                const fn = getAnim(name);
                if (!fn) { console.warn(`[LevelScene] unknown anim "${name}"`); return; }
                await fn(this);
                this.refreshVisuals();
            },
            sfx: name => { if (isDebug()) console.debug(`[sfx] ${name}`); },   // audio arrives in M4
            walkTo: async point => {
                const p = this.map.points[point];
                if (!p) { console.warn(`[LevelScene] unknown point "${point}"`); return; }
                await this.walkTo(p);
            },
            openPuzzle: id => this.openPuzzle(id),
            goto: async (level, screen) => {
                const next = LevelScene.resolveLevel(level);
                if (!next) { console.warn(`[LevelScene] level ${level} is not available`); return; }
                await this.loadLevel(next, screen);
            },
            cutscene: name => this.playCutscene(name),
            wait: ms => new Promise(resolve => this.time.delayedCall(ms, resolve)),
            checkpoint: () => this.checkpoint(),
            progress: () => {
                this.hints?.notifyProgress();
                this.refreshVisuals();
            },
        };
    }

    say (speaker: SpeakerId, key: string): Promise<void>
    {
        this.talking++;
        return new Promise(resolve => {
            const off = bus.on('say:done', () => { off(); this.talking--; resolve(); });
            bus.emit('say', { speaker, textKey: key });
        });
    }

    dialog (dialogId: string): Promise<void>
    {
        this.talking++;
        return new Promise(resolve => {
            const off = bus.on('dialog:end', e => {
                if (e.dialogId !== dialogId) return;
                off();
                this.talking--;
                resolve();
            });
            bus.emit('dialog:start', { dialogId });
        });
    }

    /** Overlay screens arrive in Task 7. */
    openPuzzle (puzzleId: PuzzleId): Promise<boolean>
    {
        console.warn(`[LevelScene] puzzle "${puzzleId}" is not implemented yet`);
        return Promise.resolve(false);
    }

    playCutscene (name: string): Promise<void>
    {
        const fn = getCutscene(name);
        if (!fn) { console.warn(`[LevelScene] unknown cutscene "${name}"`); return Promise.resolve(); }
        return fn(this, new Promise<void>(() => {})).then(() => this.refreshVisuals());
    }

    checkpoint (): void
    {
        saveGame(gameState.toSaveData());
        bus.emit('checkpoint');
    }

    // --- hints --------------------------------------------------------------

    private hintSpeaker (): SpeakerId
    {
        return gameState.hasFlag('L01_SPITZ_FREED') ? 'spitz' : 'ksyusha';
    }

    private onHintRequest ()
    {
        if (this.isBusy || !this.hints) return;
        const key = this.hints.nextHint();
        if (key) void this.runScript([{ say: this.hintSpeaker(), key }]);
    }

    private onHintTick ()
    {
        if (this.isBusy || this.isWalking || !this.hints) return;
        const key = this.hints.tick();
        if (key) void this.runScript([{ say: this.hintSpeaker(), key }]);
    }

    // --- walking internals --------------------------------------------------

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

    private applyTexture ()
    {
        if (!this.ksyusha) return;
        const up = this.facing === 'ur' || this.facing === 'ul';
        this.ksyusha.setTexture(`ksyusha_${up ? 'ur' : 'dr'}_${this.pose}`);
        this.ksyusha.setFlipX(this.facing === 'dl' || this.facing === 'ul');   // left poses mirror the right ones
    }

    private syncSprite ()
    {
        if (!this.ksyusha) return;
        this.ksyusha.setPosition(this.pos.x, this.pos.y + this.bob.y);
        this.ksyusha.setAngle(this.bob.angle);
        this.ksyusha.setDepth(this.pos.y);
    }

    private pushTrail ()
    {
        const last = this.trail[this.trail.length - 1];
        if (!last || distance(last, this.pos) >= 4) this.trail.push({ ...this.pos });
        // keep only what the follower can need
        let len = 0;
        for (let i = this.trail.length - 1; i > 0; i--) {
            len += distance(this.trail[i], this.trail[i - 1]);
            if (len > SPITZ_FOLLOW_DIST * 3) { this.trail.splice(0, i - 1); break; }
        }
    }

    /** The spitz walks along Ksyusha's trail and stays SPITZ_FOLLOW_DIST behind her. */
    private updateSpitz ()
    {
        const sp = this.spitz;
        if (!sp || !sp.visible || this.trail.length === 0) return;
        let remaining = SPITZ_FOLLOW_DIST;
        let target = this.trail[0];
        for (let i = this.trail.length - 1; i > 0; i--) {
            const a = this.trail[i];
            const b = this.trail[i - 1];
            const d = distance(a, b);
            if (d >= remaining) {
                const t = remaining / d;
                target = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
                remaining = 0;
                break;
            }
            remaining -= d;
        }
        if (remaining > 0) {
            // trail shorter than the follow distance: do not move closer than it
            if (distance({ x: sp.x, y: sp.y }, this.pos) <= SPITZ_FOLLOW_DIST) return;
        }
        if (target.x !== sp.x) sp.setFlipX(target.x < sp.x);
        sp.setPosition(target.x, target.y).setDepth(target.y);
    }

    // --- drawing ------------------------------------------------------------

    private drawOutlines ()
    {
        const g = this.outlineGfx;
        if (!g || !this.map) return;
        g.clear();
        const all = this.time.now < this.highlightUntil;
        if (!all && !this.hoverId) return;
        g.lineStyle(4, 0xffffff, 0.9);
        for (const h of this.map.hotspots) {
            if (!isHotspotActive(h, f => gameState.hasFlag(f))) continue;
            if (!all && h.id !== this.hoverId) continue;
            tracePath(g, h.shape, true);
            g.strokePath();
        }
    }

    private drawDebug ()
    {
        const g = this.debugGfx;
        if (!g || !this.map) return;
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

function ignoreInterrupt (e: unknown): void
{
    if (!(e instanceof WalkInterruptedError)) throw e;
}

function tracePath (g: GameObjects.Graphics, pts: readonly Vec2[], close: boolean): void
{
    g.beginPath();
    pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    if (close) g.closePath();
}
