import { Scene, type GameObjects, type Input, type Tweens } from 'phaser';
import { bus } from '../../events';
import { GAME_HEIGHT, GAME_WIDTH, LEVEL_STYLE, type CursorKind, type Facing, type ItemId, type LevelId, type MoodId, type PuzzleId, type SpeakerId } from '../data/types';
import { colorFromKey, ensureTexture, isPlaceholder } from '../assets/placeholder';
import { loadLevelAssets } from '../assets/loadLevelAssets';
import { animOwner, firstAnimated, showVisual, walkAnimChoices, type WalkChoice } from '../assets/anims';
import { getGameData } from '../data/gameData';
import { isDebug } from '../debug';
import { parseTiledMap, type HotspotDef, type LevelMap } from '../map/parseTiledMap';
import { NavGrid } from '../nav/NavGrid';
import { facingFromVector, moveDirFromVector, type MoveDir } from '../nav/facing';
import { distance, type Vec2 } from '../nav/geometry';
import { ScriptRunner, type ScriptContext } from '../script/ScriptRunner';
import type { HotspotScript, LevelScript, ScreenScript, Step } from '../script/types';
import { inspectSteps, itemSteps, leadsAway, useSteps } from '../script/selectSteps';
import { HintSystem } from '../systems/HintSystem';
import { hitTestHotspots, isHotspotActive } from '../systems/hotspots';
import { gameState } from '../../state/gameState';
import { saveGame } from '../../state/SaveService';
import { getAnim, getCutscene, getHintResolver, getLevelVisual } from './registry';
import { createScreen, type OverlayScreen, type OverlaySceneData } from './OverlayScene';
import { openShortcut } from './overlayClose';
import { addInteractionMarker } from './interactionMarker';
import { TransitionScene, type TransitionData } from './TransitionScene';
import { applyNameChoice, applySpitzName } from '../data/names';
import { getAudio } from '../audio/AudioManager';
import { ambientForLevel, musicForLevel } from '../audio/volume';
import { combineItems } from '../../puzzles/logic/combine';
import { releaseAction, DRAG_THRESHOLD_PX, LONG_PRESS_MS } from '../../ui/input/press';

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
const BLINK_INTERVAL_MS = 3800;
const BLINK_DURATION_MS = 140;
const PHONE_IDLE_MS = 12000;
const PHONE_DURATION_MS = 4000;
const PHONE_INTERVAL_MS = 20000;
const HIGHLIGHT_MS = 2000;
const SPITZ_FOLLOW_DIST = 80;
const KSYUSHA_W = 90;
const KSYUSHA_H = 360;
const SPITZ_W = 120;
const SPITZ_H = 90;
const SHADOW_COLOR = 0x221522;
const SHADOW_ALPHA = 0.36;
const SPRITE_PLACEHOLDER_W = 64;
const SPRITE_PLACEHOLDER_H = 128;
const OUTLINE_DEPTH = 900_000;
const ZOOM_MS = 500;
const FADE_MS = 400;
const ZOOM_LEVEL = 1.6;
const CAPTION_DEPTH = 950_000;
const DEBUG_DEPTH = 1_000_000;

type Pose = 'idle' | 'use' | 'talk' | 'hihik';
const POSES: readonly Pose[] = ['idle', 'use', 'talk', 'hihik'];
/** World 1 sprites are drawn small (≈48–56 px high) and shown ×4 with sharp pixels. */
const PIXEL_SCALE = 4;

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
    private sprites = new Map<string, GameObjects.Sprite>();
    private runner: ScriptRunner;
    hints: HintSystem | null = null;
    private loading = false;
    private transitioning = false;
    private heldEnter: Step[] | null = null;
    private levelGeneration = 0;

    // characters
    ksyusha: GameObjects.Sprite;
    spitz: GameObjects.Sprite | null = null;
    private nameCancel: (() => void) | null = null;
    private talkCancel: (() => void) | null = null;
    private pos: Vec2 = { x: 0, y: 0 };
    private facing: Facing = 'dr';
    private moveDir: MoveDir = 'd';     // screen direction of the current walk step (4-direction walk frames)
    private pose: Pose = 'idle';
    private idleElapsed = 0;
    private idleDetailKey: string | undefined;
    private trail: Vec2[] = [];
    private spitzMoving = false;
    private ksyushaShadow: GameObjects.Ellipse;
    private spitzShadow: GameObjects.Ellipse | null = null;

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
    private cursorKind: CursorKind = 'default';
    private highlightUntil = 0;
    private lastWrongKey: string | undefined;
    private touch: { pt: Vec2; t0: number; dragged: boolean; timer: { remove: () => void } } | null = null;
    private tapFlash: { id: string; until: number } | null = null;
    private outlineGfx: GameObjects.Graphics;
    private interactionMarkers: GameObjects.Container | null = null;
    private spitzMarker: GameObjects.Graphics;
    private debugGfx: GameObjects.Graphics | null = null;
    private offBus: (() => void)[] = [];
    private actionHotspot: HotspotDef | null = null;
    private movingHotspots = new Map<string, (delta: number) => void>();
    private screens = new Map<PuzzleId, OverlayScreen>();
    private skipCutscene: (() => void) | null = null;
    private pendingTalk = new Set<() => void>();   // resolvers of say/dialog promises waiting for the UI
    private placeholderBoxes: { h: HotspotDef; objs: GameObjects.Components.Visible[] }[] = [];

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

    get isTransitioning (): boolean { return this.transitioning; }

    get isBusy (): boolean { return this.busy || this.scriptPhase || this.talking > 0 || this.loading || this.transitioning; }

    get currentLevel (): LevelScript | null { return this.script; }

    get currentScreenId (): string { return this.screenId; }

    /** Game state for level visuals and animations. */
    registryState (): typeof gameState { return gameState; }

    /** A sprite placed through the Tiled `sprites` layer, by its name. */
    getSprite (name: string): GameObjects.Sprite | undefined { return this.sprites.get(name); }

    /** Keeps a moving NPC's interaction geometry aligned with its map sprite. */
    animateHotspot (id: string, advance: (delta: number) => void): void
    {
        if (this.movingHotspots.has(id)) return;
        const sprite = this.getSprite(id);
        const hotspot = this.map.hotspots.find(h => h.id === id);
        if (!sprite || !hotspot) return;
        const start = { x: sprite.x, y: sprite.y };
        const shape = hotspot.shape.map(p => ({ ...p }));
        const approach = { ...hotspot.approach };
        const marker = this.interactionMarkers?.getByName(id) as GameObjects.Graphics | undefined;
        const markerOrigin = marker && { x: marker.x, y: marker.y };
        this.movingHotspots.set(id, delta => {
            advance(delta);
            const dx = sprite.x - start.x;
            const dy = sprite.y - start.y;
            for (const [i, p] of hotspot.shape.entries()) {
                p.x = shape[i].x + dx;
                p.y = shape[i].y + dy;
            }
            hotspot.approach.x = approach.x + dx;
            hotspot.approach.y = approach.y + dy;
            if (markerOrigin) marker?.setPosition(markerOrigin.x + dx, markerOrigin.y + dy);
        });
    }

    /** Teleports Ksyusha (cutscenes / animations). */
    placeKsyusha (p: Vec2): void
    {
        this.cancelWalk();
        this.stopBob();
        this.applyTexture();
        this.pos = { x: p.x, y: p.y };
        this.trail = [{ ...this.pos }];
        this.syncSprite();
    }

    setFacing (f: Facing, dir: MoveDir = f.startsWith('u') ? 'u' : 'd'): void
    {
        this.facing = f;
        this.moveDir = dir;
        this.applyTexture();
    }

    /** A standalone spitz for cutscenes or for the follower. */
    createSpitzSprite (p: Vec2): GameObjects.Sprite
    {
        const idle = `spitz_${this.charStyle()}_idle`;
        const texture = animOwner(idle)?.key ?? ensureTexture(this, idle, SPITZ_W, SPITZ_H, characterName('spitz'));
        const sprite = this.add.sprite(p.x, p.y, texture).setOrigin(0.5, 1);
        showVisual(sprite, idle);
        return sprite.setScale(this.spriteScale(idle));
    }

    /** Shows (or creates) the spitz at `p` and makes him follow Ksyusha. */
    showSpitz (p: Vec2): GameObjects.Sprite
    {
        if (!this.spitz) {
            this.spitz = this.createSpitzSprite(p);
            this.spitzShadow = this.add.ellipse(p.x, p.y, 74, 18, SHADOW_COLOR);
            this.spitzMoving = false;
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
        this.resetIdle();
        this.cancelWalk();
        const path = this.nav.findPath(this.pos, target);
        this.path = path;
        this.drawDebug();
        if (path.length === 0) {
            this.stopBob();
            this.applyTexture();
            return Promise.resolve();
        }
        return new Promise<void>((resolve, reject) => {
            this.walk = { resolve, reject };
            this.faceTowards(path[0]);   // also switches to the walk animation, if there is one
            if (!this.walkAnim()) this.startBob();   // no walk frames: the old «puppet» sway
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
            this.movingHotspots.clear();
            if (this.script?.levelId !== script.levelId) this.screens.clear();   // puzzle state lives until the level ends
            this.placeholderBoxes = [];
            this.interactionMarkers = null;
            this.spitz = null;
            this.spitzShadow = null;
            this.cameras.main.setZoom(1).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
            this.busy = false;
            this.scriptPhase = false;
            this.hoverId = null;
            this.actionHotspot = null;

            const mapKey = `map:${screenScript.map}`;
            await this.loadFiles(l => { if (!this.cache.json.exists(mapKey)) l.json(mapKey, screenScript.map); });
            this.map = parseTiledMap(this.cache.json.get(mapKey));
            this.nav = new NavGrid(this.map.walkable, this.map.blockers, 16, GAME_WIDTH, GAME_HEIGHT);
            const bgKey = this.map.background;   // a key of public/data/assets.json
            const manifest = getGameData()?.manifest;
            bus.emit('loading', { progress: 0 });
            if (manifest) await loadLevelAssets(this, script.levelId, manifest, undefined, p => bus.emit('loading', { progress: p }));

            this.script = script;
            this.screenId = screenId;
            this.screen = screenScript;
            gameState.levelId = script.levelId;
            gameState.screenId = screen ?? null;
            this.buildScene(bgKey);
            this.hints = new HintSystem(script.goals, f => gameState.hasFlag(f), () => this.time.now);
        } finally {
            this.loading = false;
            bus.emit('loading', { progress: null });
        }
        this.checkpoint();
        this.updateMusic();   // during a brush transition the new music starts when it is over
        bus.emit('scene:ready', { levelId: script.levelId, screenId: screen ?? null });
        if (screenScript.onEnter?.length) {
            if (this.transitioning) this.heldEnter = screenScript.onEnter;   // runs when the brush transition is over
            else void this.runScript(screenScript.onEnter);
        }
    }

    /**
     * «Перерисовка кистью» between worlds (end of L03, end of L05, entering L08), ≈2.5 s, input blocked:
     * snapshot of the old frame on top → the new world loads underneath → the snapshot is erased with brush strokes.
     */
    private async brushTransition (load: () => Promise<void>): Promise<void>
    {
        this.transitioning = true;
        const gen = this.levelGeneration;   // the load below bumps it by one; anything else = the scene was stopped
        try {
            const image = await new Promise<HTMLImageElement>(resolve => this.game.renderer.snapshot(img => resolve(img as HTMLImageElement)));
            const actors = [this.ksyusha, this.spitz].filter((a): a is GameObjects.Sprite => !!a && a.visible)
                .map(a => ({ texture: a.texture.key, frame: a.frame.name, flipX: a.flipX, scale: a.scaleX, pos: { x: a.x, y: a.y } }));
            const data: TransitionData = { image, actors };
            this.scene.launch('TransitionScene', data);
            this.scene.bringToTop('TransitionScene');
            await new Promise<void>(resolve => this.time.delayedCall(50, () => resolve()));   // let it draw the old frame
            const ts = this.scene.get('TransitionScene') as TransitionScene;
            this.playSfx('sfx_transition');
            await load();
            if (this.levelGeneration !== gen + 1) return;   // the scene was stopped / restarted during the load
            const hidden = [this.ksyusha, this.spitz].filter((a): a is GameObjects.Sprite => !!a && a.visible);
            hidden.forEach(a => a.setAlpha(0));
            await ts.reveal();
            await ts.finish(hidden.map(a => ({ x: a.x, y: a.y })));
            hidden.forEach(a => a.setAlpha(1));
        } finally {
            this.transitioning = false;
            if (this.scene.isActive('TransitionScene') || this.scene.isPaused('TransitionScene')) this.scene.stop('TransitionScene');
        }
        if (this.levelGeneration !== gen + 1) { this.heldEnter = null; return; }   // stopped / restarted meanwhile
        this.updateMusic();
        const enter = this.heldEnter;
        this.heldEnter = null;
        if (enter) void this.runScript(enter);
    }

    /** Sound effect (AudioManager; missing files are skipped silently). */
    playSfx (name: string, gain = 1): void
    {
        if (isDebug()) console.debug(`[sfx] ${name}`);
        getAudio()?.playSfx(name, gain);
    }

    /** Music of the world (L07 after the reconciliation: the finale theme) and the level's background noise. */
    updateMusic (): void
    {
        if (!this.script || this.transitioning) return;
        const lvl = this.script.levelId;
        const audio = getAudio();
        audio?.playMusic(lvl === 'L07' && gameState.hasFlag('L07_CAT_RECONCILED') ? 'mus_finale' : musicForLevel(lvl));
        audio?.playAmbient(this.screenId === 'post' ? null : ambientForLevel(lvl));
    }

    /** Camera fade out (true) / in (false), FADE_MS. */
    private fade (out: boolean): Promise<void>
    {
        const cam = this.cameras.main;
        return new Promise(resolve => {
            cam.once(out ? 'camerafadeoutcomplete' : 'camerafadeincomplete', () => resolve());
            if (out) cam.fadeOut(FADE_MS, 0, 0, 0);
            else cam.fadeIn(FADE_MS, 0, 0, 0);
        });
    }

    /** Re-applies level visuals (call after state changes outside scripts). */
    refreshVisuals (): void
    {
        for (const { h, objs } of this.placeholderBoxes) {
            const on = isHotspotActive(h, f => gameState.hasFlag(f));
            for (const o of objs) o.setVisible(on);
        }
        for (const h of this.map?.hotspots ?? []) {
            const marker = this.interactionMarkers?.getByName(h.id) as GameObjects.Graphics | undefined;
            marker?.setVisible(isHotspotActive(h, f => gameState.hasFlag(f)));
        }
        if (this.script) getLevelVisual(this.script.levelId)?.(this);
    }

    // --- Phaser lifecycle ---------------------------------------------------

    init (data: LevelSceneData)
    {
        this.pendingStart = data ?? {};
        // A fresh start (new game, Continue, level select) begins with fresh puzzles; goto inside a level keeps them.
        this.screens = new Map();
        this.script = null;
        this.path = [];
        this.walk = null;
        this.bobTweens = [];
        this.bob = { y: 0, angle: 0 };
        this.busy = false;
        this.scriptPhase = false;
        this.talking = 0;
        this.debugGfx = null;
        this.interactionMarkers = null;
        this.spitz = null;
        this.spitzShadow = null;
        this.sprites = new Map();
        this.movingHotspots.clear();
        this.skipCutscene = null;
        this.actionHotspot = null;
        this.pendingTalk = new Set();
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
            bus.on('item:combine', ({ a, b }) => this.onCombine(a, b)),
        );
        this.time.addEvent({ delay: 1000, loop: true, callback: () => this.onHintTick() });
        this.events.once('shutdown', () => {
            // Drop everything that belongs to the stopped game: running scripts end at their next step,
            // pending say/dialog listeners are removed so a later "say:done" cannot resume them.
            this.levelGeneration++;
            for (const release of [...this.pendingTalk]) release();
            this.pendingTalk.clear();
            this.talking = 0;
            this.nameCancel?.();   // a stopped scene must not leave the name screen open
            this.talkCancel?.();
            this.skipCutscene = null;
            this.actionHotspot = null;
            this.busy = false;
            this.scriptPhase = false;
            this.transitioning = false;
            this.heldEnter = null;
            if (this.scene.isActive('TransitionScene') || this.scene.isPaused('TransitionScene')) this.scene.stop('TransitionScene');
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
        if (!this.ksyusha || this.loading) return;
        if (this.movingHotspots.size) {
            const patrolDelta = this.isBusy || this.touch ? 0 : delta;
            for (const advance of this.movingHotspots.values()) advance(patrolDelta);
            const pointer = this.input.activePointer;
            if (!pointer.wasTouch) this.updateHover({ x: pointer.worldX, y: pointer.worldY });
        }
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
            this.stepSound(delta);
            this.drawDebug();
        }
        this.syncSprite(delta);
        this.updateSpitz(delta);
        this.syncShadows();
        this.syncInteractionMarkers();
        this.drawOutlines();
    }

    // --- building -----------------------------------------------------------

    private buildScene (bgKey: string)
    {
        const bgMissing = !this.textures.exists(bgKey);
        ensureTexture(this, bgKey, GAME_WIDTH, GAME_HEIGHT, this.map.background);
        // world 1 backgrounds are 480×270 and are shown ×4 (NEAREST filtering set by the loader)
        this.add.image(0, 0, bgKey).setOrigin(0, 0).setDepth(-1).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
        if (bgMissing) this.drawPlaceholderObjects();
        for (const s of this.map.sprites) {
            const key = ensureTexture(this, s.texture, SPRITE_PLACEHOLDER_W, SPRITE_PLACEHOLDER_H, s.name);
            // an animation with the same key as the sprite's texture (e.g. `l01b_tik`) plays in a loop: the world lives
            const spr = this.add.sprite(s.pos.x, s.pos.y, key).setOrigin(0.5, 1).setDepth(s.depthY);
            showVisual(spr, s.texture);
            this.sprites.set(s.name, spr.setScale(this.spriteScale(s.texture)));
        }
        for (const up of [false, true]) {
            for (const pose of POSES) ensureTexture(this, this.ksyushaKey(up, pose), KSYUSHA_W, KSYUSHA_H, characterName('ksyusha'));
        }
        const spawn = this.map.points.spawn ?? this.nav.nearestWalkable({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 }) ?? { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
        this.pos = { x: spawn.x, y: spawn.y };
        this.trail = [{ ...this.pos }];
        this.pose = 'idle';
        this.idleElapsed = 0;
        this.idleDetailKey = undefined;
        this.ksyushaShadow = this.add.ellipse(this.pos.x, this.pos.y, 65, 16, SHADOW_COLOR);
        this.ksyusha = this.add.sprite(this.pos.x, this.pos.y, this.ksyushaKey(false, 'idle')).setOrigin(0.5, 1);
        this.setFacing('dr');
        const markers = this.add.container().setDepth(OUTLINE_DEPTH - 1)
            .setName('interaction-markers').setVisible(false);
        this.interactionMarkers = markers;
        for (const h of this.map.hotspots) {
            const center = centroid(h.shape);
            const { x, y } = this.map.points[`marker_${h.id}`] ?? { x: center.x, y: center.y - (bgMissing ? 34 : 0) };
            markers.add(addInteractionMarker(this, x, y).setName(h.id));
        }
        this.spitzMarker = addInteractionMarker(this, 0, 0).setName('spitz-companion').setVisible(false);
        markers.add(this.spitzMarker);
        this.outlineGfx = this.add.graphics().setDepth(OUTLINE_DEPTH);
        this.debugGfx = isDebug() ? this.add.graphics().setDepth(DEBUG_DEPTH) : null;
        if (gameState.hasFlag('L01_SPITZ_FREED')) {
            const sp = this.map.points.spitz_spawn ?? this.nav.nearestWalkable({ x: this.pos.x - SPITZ_FOLLOW_DIST, y: this.pos.y }) ?? this.pos;
            this.showSpitz(sp);
        }
        this.refreshVisuals();
        this.syncSprite();
        this.syncShadows();
        this.drawDebug();
    }

    /** Without real art: hotspots are drawn as labelled boxes so the level can be played on placeholders. */
    private drawPlaceholderObjects ()
    {
        for (const h of this.map.hotspots) {
            const g = this.add.graphics().setDepth(0);
            g.fillStyle(colorFromKey(h.id), 0.55);
            g.lineStyle(3, 0x000000, 0.6);
            tracePath(g, h.shape, true);
            g.fillPath();
            g.strokePath();
            const c = centroid(h.shape);
            const label = this.add.text(c.x, c.y, h.id, { fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 })
                .setOrigin(0.5).setDepth(0);
            this.placeholderBoxes.push({ h, objs: [g, label] });
        }
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
        if (this.skipCutscene) { this.skipCutscene(); return; }   // any click skips a cutscene
        if (this.loading || !this.map) return;
        this.resetIdle();
        const pt = { x: p.worldX, y: p.worldY };
        if (p.rightButtonDown()) { this.inspectAt(pt); return; }
        if (p.wasTouch) {
            // Touch (classifyPress): tap = primary action on release, long press = inspect, a moved finger = nothing.
            this.touch?.timer.remove();
            const timer = this.time.delayedCall(LONG_PRESS_MS, () => {
                const t = this.touch;
                this.touch = null;
                if (t && !t.dragged) this.inspectAt(t.pt);
            });
            this.touch = { pt, t0: this.time.now, dragged: false, timer };
            return;
        }
        this.primaryAt(pt);
    }

    /** Finger movement in CSS pixels since it touched down. */
    private movedCss (p: Input.Pointer, from: Vec2): number
    {
        const scale = this.scale.displayScale.x || 1;   // game px per CSS px
        return Math.hypot(p.worldX - from.x, p.worldY - from.y) / scale;
    }

    private onPointerUp (p: Input.Pointer)
    {
        const t = this.touch;
        if (!t) return;
        t.timer.remove();
        this.touch = null;
        const action = releaseAction(this.time.now - t.t0, t.dragged ? Infinity : this.movedCss(p, t.pt), p.wasCanceled);
        if (action === 'inspect') { this.inspectAt(t.pt); return; }   // released before the long-press timer ticked
        if (action !== 'use') return;   // cancelled touch or drag (scroll gesture) never uses a hotspot
        const h = this.hotspotAt(t.pt);
        if (h) this.tapFlash = { id: h.id, until: this.time.now + 400 };   // phones: the first tap briefly outlines it
        this.primaryAt(t.pt);
    }

    private onPointerMove (p: Input.Pointer)
    {
        if (this.touch && !this.touch.dragged && this.movedCss(p, this.touch.pt) > DRAG_THRESHOLD_PX) {
            this.touch.dragged = true;   // a drag/scroll gesture: no use, no inspect
            this.touch.timer.remove();
        }
        if (p.wasTouch || !this.map) return;
        this.updateHover({ x: p.worldX, y: p.worldY });
    }

    private updateHover (pt: Vec2)
    {
        const h = this.isBusy ? null : this.hotspotAt(pt);
        const id = h?.id ?? null;
        if (id !== this.hoverId) this.hoverId = id;
        const kind = h ? this.cursorFor(h) : 'default';
        if (kind !== this.cursorKind) {
            this.cursorKind = kind;
            bus.emit('cursor', { kind });
        }
    }

    /** Hotspots whose current use leads to another screen show the exit cursor. */
    private cursorFor (h: HotspotDef): CursorKind
    {
        const steps = useSteps(this.script?.levelId ?? 'L01', h.id, this.scriptFor(h), gameState);
        return leadsAway(steps) ? 'exit' : h.cursor;
    }

    private hotspotAt (pt: Vec2): HotspotDef | null
    {
        return hitTestHotspots(this.map.hotspots, pt, f => gameState.hasFlag(f));
    }

    private primaryAt (pt: Vec2)
    {
        if (this.scriptPhase || this.talking > 0 || this.loading || this.transitioning) return;
        const h = this.hotspotAt(pt);
        if (h) {
            if (this.busy) return;   // already acting on a hotspot: ignore repeated clicks
            void this.interact(h, { kind: 'use' });
            return;
        }
        if (!this.busy && this.spitzAt(pt)) {
            void this.runScript([{ openTalk: 'spitz' }]);
            return;
        }
        // Floor: walk there (interrupts walking to a hotspot).
        this.walkTo(pt).catch(ignoreInterrupt);
    }

    private inspectAt (pt: Vec2)
    {
        if (this.busy || this.scriptPhase || this.talking > 0 || this.loading || this.transitioning) return;
        const h = this.hotspotAt(pt);
        if (h) void this.interact(h, { kind: 'inspect' });
    }

    /** Inventory item dropped on another one: the valid pair turns into a new item, anything else "does not combine". */
    private onCombine (a: ItemId, b: ItemId)
    {
        if (this.isBusy || !gameState.hasItem(a) || !gameState.hasItem(b)) return;
        const result = combineItems(a, b);
        if (!result) {
            void this.runScript([{ say: 'ksyusha', key: 'common.cantCombine' }]);
            return;
        }
        gameState.removeItem(a);
        gameState.removeItem(b);
        gameState.addItem(result);
        this.playSfx('sfx_combine');
        this.hints?.notifyProgress();
        this.refreshVisuals();
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

    private pickWrongKey (): string
    {
        const tb = getGameData()?.texts;
        const key = tb ? tb.randomVariant('common.wrongItem', Math.random, this.lastWrongKey).key : 'common.wrongItem.1';
        this.lastWrongKey = key;
        this.playSfx('sfx_nope');
        return key;
    }

    private async interact (h: HotspotDef, a: { kind: 'use' } | { kind: 'inspect' } | { kind: 'item'; itemId: ItemId })
    {
        if (this.busy) return;
        this.busy = true;
        this.actionHotspot = h;
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
            const lvl = this.script?.levelId ?? 'L01';
            const steps = a.kind === 'inspect' ? inspectSteps(lvl, h.id, s)
                : a.kind === 'use' ? useSteps(lvl, h.id, s, gameState)
                    : itemSteps(s, a.itemId, () => this.pickWrongKey());
            await this.runScript(steps);
        } finally {
            if (gen === this.levelGeneration) { this.busy = false; this.actionHotspot = null; }
        }
    }

    /** Runs script steps with input locked. */
    async runScript (steps: Step[]): Promise<void>
    {
        const gen = this.levelGeneration;
        this.scriptPhase = true;
        try {
            await this.runner.run(steps, () => gen === this.levelGeneration);
        } catch (e) {
            console.error('[LevelScene] script failed', e);
        } finally {
            if (gen === this.levelGeneration) this.scriptPhase = false;
        }
    }

    private showPose (pose: Pose, ms: number): Promise<void>
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
            say: (speaker, key, mood) => this.say(speaker, key, mood),
            dialog: id => this.dialog(id),
            anim: async name => {
                const fn = getAnim(name);
                if (!fn) { console.warn(`[LevelScene] unknown anim "${name}"`); return; }
                await fn(this);
                this.refreshVisuals();
            },
            sfx: name => this.playSfx(name),
            walkTo: async point => {
                const p = this.map.points[point];
                if (!p) { console.warn(`[LevelScene] unknown point "${point}"`); return; }
                await this.walkTo(p);
            },
            openPuzzle: id => this.openPuzzle(id),
            goto: async (level, screen) => {
                const next = LevelScene.resolveLevel(level);
                if (!next) { console.warn(`[LevelScene] level ${level} is not available`); return; }
                const from = this.script ? LEVEL_STYLE[this.script.levelId] : null;
                if (from && from !== LEVEL_STYLE[next.levelId]) {
                    await this.brushTransition(() => this.loadLevel(next, screen));   // a new world: «перерисовка кистью»
                } else {
                    await this.fade(true);   // the same world: 0.4 s fade
                    await this.loadLevel(next, screen);
                    await this.fade(false);
                }
            },
            cutscene: name => this.playCutscene(name),
            wait: ms => new Promise(resolve => this.time.delayedCall(ms, resolve)),
            checkpoint: () => this.checkpoint(),
            chooseName: () => this.chooseName(),
            openTalk: id => this.openTalk(id),
            progress: () => {
                this.hints?.notifyProgress();
                this.refreshVisuals();
                this.updateMusic();
            },
        };
    }

    /**
     * Экран выбора имени шпица. Если имя уже выбрано (загрузка сохранения), экран не открывается,
     * имя только восстанавливается в текстах. «Марат» не выбирается: шпиц говорит реплику, экран остаётся.
     */
    /** Меню разговоров: ждёт, пока игрок нажмёт «Ладно, пока». Сцена остановилась — меню закрывается само. */
    openTalk (talkId: string): Promise<void>
    {
        return new Promise(resolve => {
            const finish = () => { this.talkCancel = null; off(); resolve(); };
            const off = bus.on('talk:close', finish);
            this.talkCancel = () => { finish(); bus.emit('talk:close'); };
            bus.emit('talk:open', { talkId });
        });
    }

    /** Клик по шпице-напарнику открывает меню разговоров. */
    private spitzAt (pt: Vec2): boolean
    {
        return this.talkableSpitz()?.getBounds().contains(pt.x, pt.y) ?? false;
    }

    private talkableSpitz (): GameObjects.Sprite | null
    {
        const sp = this.spitz;
        return sp?.visible && gameState.hasFlag('L01_SPITZ_FREED') && getGameData()?.talks.spitz ? sp : null;
    }

    async chooseName (): Promise<void>
    {
        const texts = getGameData()?.texts;
        if (gameState.spitzName === null) {
            await new Promise<void>(resolve => {
                const finish = () => { this.nameCancel = null; off(); resolve(); };
                const off = bus.on('name:pick', ({ option }) => {
                    if (option === 3 || applyNameChoice(gameState, option) === 'locked') {
                        void this.say('spitz', 'l01.name.marat.locked');
                        return;
                    }
                    if (texts) applySpitzName(gameState, texts);
                    this.hints?.notifyProgress();
                    finish();
                    bus.emit('name:done', { option });
                });
                this.nameCancel = () => { finish(); bus.emit('name:done', { option: 1 }); };
                bus.emit('name:open');
            });
        }
        if (texts) applySpitzName(gameState, texts);
    }

    say (speaker: SpeakerId, key: string, mood?: MoodId): Promise<void>
    {
        // Ksyusha speaks in the talk pose; a «Хихик» line uses the hihik pose.
        const own = speaker === 'ksyusha' && !!this.ksyusha && this.pose === 'idle';
        if (own) {
            this.pose = isHihik(getGameData()?.texts.t(key) ?? '') ? 'hihik' : 'talk';
            this.applyTexture();
        }
        return this.talk(done => bus.on('say:done', done), () => bus.emit('say', { speaker, textKey: key, mood }))
            .then(() => { if (own && this.pose !== 'idle') { this.pose = 'idle'; this.applyTexture(); } });
    }

    dialog (dialogId: string): Promise<void>
    {
        return this.talk(
            done => bus.on('dialog:end', e => { if (e.dialogId === dialogId) done(); }),
            () => bus.emit('dialog:start', { dialogId }),
        );
    }

    /** Waits for the UI to finish a line/dialog; released early (resolved) when the scene stops. */
    private talk (listen: (done: () => void) => () => void, start: () => void): Promise<void>
    {
        this.talking++;
        return new Promise(resolve => {
            let off: () => void = () => {};
            const release = () => {
                if (!this.pendingTalk.delete(release)) return;
                off();
                this.talking = Math.max(0, this.talking - 1);
                resolve();
            };
            this.pendingTalk.add(release);
            off = listen(release);
            start();
        });
    }

    /**
     * Zooms the camera to the hotspot being used (0.5 s) and opens the overlay screen on top.
     * Resolves true if the screen was solved, false if closed. Solving a real puzzle (P-xx) saves a checkpoint.
     */
    /** The overlay screen instance of this level (created on demand; keeps its state until the level ends). */
    ensureScreen (puzzleId: PuzzleId): OverlayScreen | null
    {
        let screen = this.screens.get(puzzleId);
        if (!screen) {
            const created = createScreen(puzzleId);
            if (!created) return null;
            screen = created;
            this.screens.set(puzzleId, screen);
        }
        return screen;
    }

    async openPuzzle (puzzleId: PuzzleId): Promise<boolean>
    {
        const screen = this.ensureScreen(puzzleId);
        if (!screen) { console.warn(`[LevelScene] no overlay screen "${puzzleId}"`); return false; }
        if (openShortcut(screen)) return true;   // solved before (e.g. closed during the success animation)
        const cam = this.cameras.main;
        const h = this.actionHotspot;
        if (h) {
            const c = centroid(h.shape);
            cam.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
            await new Promise<void>(resolve => {
                cam.pan(c.x, c.y, ZOOM_MS, 'Sine.easeInOut');
                cam.zoomTo(ZOOM_LEVEL, ZOOM_MS, 'Sine.easeInOut', false, (_c: unknown, progress: number) => { if (progress >= 1) resolve(); });
            });
        }
        bus.emit('puzzle:open', { puzzleId });
        const solved = await new Promise<boolean>(resolve => {
            const data: OverlaySceneData = {
                screen,
                services: {
                    state: gameState,
                    progress: () => { this.hints?.notifyProgress(); this.refreshVisuals(); },
                    say: (speaker, key) => this.say(speaker, key),
                    sfx: name => this.playSfx(name),
                },
                onFinish: resolve,
                bgKey: CLOSEUP_BG[puzzleId],
            };
            this.scene.launch('OverlayScene', data);
            this.scene.bringToTop('OverlayScene');
        });
        cam.setZoom(1).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
        bus.emit('puzzle:close', { puzzleId, solved });
        if (solved) this.hints?.notifyProgress();   // checkpoints come from the scripts' { checkpoint: true }
        this.refreshVisuals();
        return solved;
    }

    /** Plays a registered cutscene; any click or the skip button ends it at once (with its final state). */
    async playCutscene (name: string): Promise<void>
    {
        const fn = getCutscene(name);
        if (!fn) { console.warn(`[LevelScene] unknown cutscene "${name}"`); return; }
        let skip!: () => void;
        const skipped = new Promise<void>(resolve => { skip = resolve; });
        const label = getGameData()?.texts.t('ui.skip') ?? 'Skip';
        const btn = this.add.text(GAME_WIDTH - 32, GAME_HEIGHT - 32, `${label} ▶▶`, {
            fontFamily: 'sans-serif', fontSize: '32px', color: '#ffffff', backgroundColor: '#00000099', padding: { x: 16, y: 8 },
        }).setOrigin(1, 1).setDepth(CAPTION_DEPTH + 1).setScrollFactor(0);
        this.skipCutscene = () => { this.skipCutscene = null; skip(); };
        try {
            await fn(this, skipped);
        } finally {
            this.skipCutscene = null;
            btn.destroy();
            this.refreshVisuals();
        }
    }

    /** Caption at the top of the screen for cutscenes (text key from ru.json). Returns the text object. */
    caption (key: string): GameObjects.Text
    {
        const text = getGameData()?.texts.t(key) ?? key;
        return this.add.text(GAME_WIDTH / 2, 80, text, {
            fontFamily: 'sans-serif', fontSize: '40px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 24, y: 12 },
            align: 'center', wordWrap: { width: 1600 },
        }).setOrigin(0.5, 0).setDepth(CAPTION_DEPTH).setScrollFactor(0);
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
        if (key) this.sayHint(key);
    }

    private sayHint (key: string)
    {
        const lvl = this.script?.levelId;
        const keys = (lvl && getHintResolver(lvl)?.(key, this)) || [key];
        const speaker = this.hintSpeaker();
        void this.runScript(keys.map(k => ({ say: speaker, key: k })));
    }

    private onHintTick ()
    {
        if (this.isBusy || this.isWalking || !this.hints) return;
        const key = this.hints.tick();
        if (key) this.sayHint(key);
    }

    // --- walking internals --------------------------------------------------

    private stepClock = 0;

    /** Footsteps by the surface of the map (Tiled property `footsteps`), one per bob period. */
    private stepSound (delta: number)
    {
        this.stepClock += delta;
        if (this.stepClock < BOB_PERIOD_MS) return;
        this.stepClock = 0;
        if (this.map) this.playSfx(`sfx_step_${this.map.footsteps}`);
    }

    private finishWalk ()
    {
        this.stopBob();
        const w = this.walk;
        this.walk = null;
        this.applyTexture();   // walk animation → idle
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
        this.setFacing(facingFromVector(dx, dy), moveDirFromVector(dx, dy));
    }

    private applyTexture ()
    {
        if (!this.ksyusha) return;
        const up = this.facing === 'ur' || this.facing === 'ul';
        const walk = this.walkAnim();
        const poseKey = this.ksyushaKey(up, this.pose);
        const directionalIdle = `ksyusha_${this.charStyle()}_${this.moveDir}_idle`;
        const useDirectionalIdle = isPlaceholder(poseKey) && !this.anims.exists(poseKey) && this.anims.exists(directionalIdle);
        const detail = this.pose === 'idle' && !this.isBusy ? this.idleDetailKey : undefined;
        const key = walk?.key ?? detail ?? (useDirectionalIdle ? directionalIdle : poseKey);
        const { currentAnim, currentFrame, isPlaying } = this.ksyusha.anims;
        // All four pixel-art directions use the same step phases.
        const pixelWalk = /^ksyusha_w1_[dulr]_walk$/;
        if (isPlaying && currentAnim && currentFrame && currentAnim.key !== key &&
            pixelWalk.test(currentAnim.key) && pixelWalk.test(key)) {
            this.ksyusha.play({ key, startFrame: currentFrame.index - 1 });
        } else {
            showVisual(this.ksyusha, key);
        }
        this.ksyusha.setScale(this.spriteScale(key));
        // Directional frames already face the right way; diagonal poses are mirrored.
        this.ksyusha.setFlipX(walk?.flipX ?? (!detail && !useDirectionalIdle && (this.facing === 'dl' || this.facing === 'ul')));
    }

    /**
     * Animation of Ksyusha's walk for the current direction, if the author made one (see walkAnimChoices):
     * `ksyusha_<style>_<d|u|l|r>_walk` by the screen direction, else `ur_walk` / `dr_walk` (left mirrored).
     * Undefined when she is not walking, is in another pose or there are no walk frames.
     */
    private walkAnim (): WalkChoice | undefined
    {
        if (!this.walk || this.pose !== 'idle') return undefined;
        return walkAnimChoices(`ksyusha_${this.charStyle()}`, this.facing, this.moveDir).find(c => this.anims.exists(c.key));
    }

    /** Spitz: `spitz_<style>_walk` while he follows (if there is such an animation), else `spitz_<style>_idle`. */
    private applySpitzVisual (moving: boolean)
    {
        const sp = this.spitz;
        if (!sp || this.spitzMoving === moving) return;
        this.spitzMoving = moving;
        const st = this.charStyle();
        const key = (moving ? firstAnimated(this, [`spitz_${st}_walk`]) : undefined) ?? `spitz_${st}_idle`;
        showVisual(sp, key);
        sp.setScale(this.spriteScale(key));
    }

    /** Art style of the characters on this screen: w1/w2/w3; the finale uses world 3, the post-credits scene world 1. */
    charStyle (): 'w1' | 'w2' | 'w3'
    {
        if (this.screenId === 'post') return 'w1';
        const s = this.script ? LEVEL_STYLE[this.script.levelId] : 'w1';
        return s === 'fin' ? 'w3' : s;
    }

    /** Pose textures (ASSET_REQUIREMENTS §1): dr_idle, ur_idle, dr_use, dr_talk, dr_hihik; left = mirrored. */
    private ksyushaKey (up: boolean, pose: Pose): string
    {
        const dir = pose === 'idle' && up ? 'ur' : 'dr';
        return `ksyusha_${this.charStyle()}_${dir}_${pose}`;
    }

    /** Real world-1 pixel sprites (and their animations) are scaled ×4; placeholders and other worlds stay 1:1. */
    private spriteScale (key: string): number
    {
        const owner = this.anims.exists(key) ? animOwner(key) : undefined;
        if (owner) return owner.pixelArt ? PIXEL_SCALE : 1;
        if (isPlaceholder(key)) return 1;
        const e = getGameData()?.manifest.entries.find(x => x.key === key);
        return e?.pixelArt ? PIXEL_SCALE : 1;
    }

    private syncSprite (delta = 0)
    {
        const k = this.ksyusha;
        if (!k || this.tweens.isTweening(k)) return;
        k.setPosition(this.pos.x, this.pos.y + this.bob.y);
        k.setAngle(this.bob.angle);
        k.setDepth(this.pos.y);
        if (k.texture.key === 'ksyusha_w1') {
            this.updateIdleDetail(delta);
            // A subtle breathing cycle with the soles fixed at the sprite origin.
            const breath = 1 + 0.01 * (1 - Math.cos(this.idleElapsed * 2 * Math.PI / 2600));
            k.setScale(k.scaleX, k.scaleX * breath);
        }
    }

    private resetIdle ()
    {
        this.idleElapsed = 0;
        if (!this.idleDetailKey) return;
        this.idleDetailKey = undefined;
        this.applyTexture();
    }

    private updateIdleDetail (delta: number)
    {
        if (this.walk || this.pose !== 'idle' || this.isBusy) {
            this.resetIdle();
            return;
        }

        this.idleElapsed += delta;
        const phoneTime = this.idleElapsed - PHONE_IDLE_MS;
        const phone = phoneTime >= 0 && phoneTime % PHONE_INTERVAL_MS < PHONE_DURATION_MS;
        const blink = this.idleElapsed % BLINK_INTERVAL_MS >= BLINK_INTERVAL_MS - BLINK_DURATION_MS;
        // Turn toward the camera to check the phone if she was looking away.
        const phoneDir = this.moveDir === 'u' ? 'd' : this.moveDir;
        const candidate = phone ? `ksyusha_w1_${phoneDir}_phone` : blink ? `ksyusha_w1_${this.moveDir}_blink` : undefined;
        const key = candidate && this.anims.exists(candidate) ? candidate : undefined;
        if (key === this.idleDetailKey) return;
        this.idleDetailKey = key;
        this.applyTexture();
    }

    private syncShadows ()
    {
        const k = this.ksyusha;
        const kAlpha = Math.min(1, k.scaleX) * k.alpha;
        this.ksyushaShadow.setPosition(this.pos.x, this.pos.y - 1).setDepth(this.pos.y - 0.5)
            .setVisible(k.visible).setAlpha(SHADOW_ALPHA * kAlpha);

        const sp = this.spitz;
        if (!sp || !this.spitzShadow) return;
        // While he jumps out from under the sofa, his shadow stays on the floor.
        const ground = gameState.hasFlag('L01_SPITZ_FREED') ? sp : this.trail[0];
        const spread = 1 - Math.min(0.4, Math.max(0, ground.y - sp.y) / 200);
        this.spitzShadow.setPosition(ground.x, ground.y - 1).setDepth(ground.y - 0.5)
            .setVisible(sp.visible).setScale(spread).setAlpha(SHADOW_ALPHA * spread * Math.min(1, sp.scaleX) * sp.alpha);
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
    private updateSpitz (delta: number)
    {
        const sp = this.spitz;
        if (!sp || !sp.visible || this.trail.length === 0 || this.tweens.isTweening(sp)) return;
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
            if (distance({ x: sp.x, y: sp.y }, this.pos) <= SPITZ_FOLLOW_DIST) { this.applySpitzVisual(false); return; }
        }
        const gap = distance(sp, target);
        this.applySpitzVisual(gap > 0.5);
        if (gap <= 0.5) return;
        const step = Math.min(1, ((WALK_SPEED + 60) * delta / 1000) / gap);
        const x = sp.x + (target.x - sp.x) * step;
        const y = sp.y + (target.y - sp.y) * step;
        if (Math.abs(target.x - sp.x) > 1) sp.setFlipX(target.x < sp.x);
        sp.setPosition(x, y).setDepth(y);
    }

    // --- drawing ------------------------------------------------------------

    private syncInteractionMarkers ()
    {
        const markers = this.interactionMarkers;
        if (!markers) return;
        const show = !this.isBusy;
        markers.setVisible(show);
        if (!show) return;
        const sp = this.talkableSpitz();
        this.spitzMarker.setVisible(!!sp);
        if (sp) this.spitzMarker.setPosition(sp.x + 30, sp.y - sp.displayHeight + 12);
    }

    private drawOutlines ()
    {
        const g = this.outlineGfx;
        if (!g || !this.map) return;
        g.clear();
        const all = this.time.now < this.highlightUntil;
        const flash = this.tapFlash && this.time.now < this.tapFlash.until ? this.tapFlash.id : null;
        if (!all && !this.hoverId && !flash) return;
        g.lineStyle(4, 0xffffff, 0.9);
        for (const h of this.map.hotspots) {
            if (!isHotspotActive(h, f => gameState.hasFlag(f))) continue;
            if (!all && h.id !== this.hoverId && h.id !== flash) continue;
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

/** Placeholder label for a character: the name from characters.json (no Russian strings in code). */
export function characterName (id: SpeakerId): string
{
    return getGameData()?.characters.names[id] ?? id;
}

/** «Хихик» lines get the hihik pose and the sparkle sound. */
export function isHihik (text: string): boolean
{
    return /хихик/i.test(text);
}

/** Background picture of each close-up screen (ASSET_REQUIREMENTS §2), drawn under the screen when it exists. */
const CLOSEUP_BG: Partial<Record<PuzzleId, string>> = {
    fridge: 'w1_fridge_close', 'P-02': 'w1_generator_close', 'S-02b': 'w1_gallery_close',
    fresco: 'w1_fresco_close', 'P-03': 'w1_bells_close',
    'P-04': 'w2_pipes_close', 'P-05': 'w2_ice_close', 'P-06': 'w3_page_close', drawing: 'w3_drawing_close',
    clock: 'fin_clock_close', 'P-08': 'fin_box_close',
};

function centroid (poly: readonly Vec2[]): Vec2
{
    const n = poly.length || 1;
    return { x: poly.reduce((a, p) => a + p.x, 0) / n, y: poly.reduce((a, p) => a + p.y, 0) / n };
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
