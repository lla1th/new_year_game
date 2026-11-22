import { Scene, GameObjects } from 'phaser';
import { bus } from '../../events';
import { GAME_HEIGHT, GAME_WIDTH, type ItemId, type PuzzleId, type SpeakerId } from '../data/types';
import type { Vec2 } from '../nav/geometry';
import { closeResult } from './overlayClose';
import type { GameStateModel } from '../../state/GameStateModel';

export const PANEL_W = 1200;
export const PANEL_H = 800;

/** What an overlay screen may do with the game. */
export interface OverlayServices {
    state: GameStateModel;
    progress(): void;
    say(speaker: SpeakerId, key: string): Promise<void>;
    sfx(name: string): void;   // audio arrives in M4
}

/**
 * Base class of puzzle screens and close-ups. One instance lives until the end of the level,
 * so a puzzle keeps its state between openings.
 */
export abstract class OverlayScreen {
    scene: Scene;
    services: OverlayServices;
    private finishFn: ((solved: boolean) => void) | null = null;

    /** Build the screen inside `container` (origin = panel centre, panel is PANEL_W×PANEL_H). */
    abstract create(container: GameObjects.Container): void;

    /**
     * Optional: an inventory item was dropped at game point `p` while this screen is open
     * (only for screens listed in PUZZLES_WITH_ITEMS). Not handled → the item simply stays in its slot.
     */
    dropItem?(itemId: ItemId, p: Vec2): void;

    /** Closes the screen; openPuzzle → true. */
    solve(): void { this.finishFn?.(true); }

    /** True once the puzzle is solved (even while its success animation still runs). Close-ups without a puzzle: false. */
    isSolved(): boolean { return false; }

    /** Closes the screen; openPuzzle → false. The puzzle state is kept until the end of the level. */
    close(): void { this.finishFn?.(false); }

    /** @internal called by OverlayScene */
    attach(scene: Scene, services: OverlayServices, finish: ((solved: boolean) => void) | null): void {
        this.scene = scene;
        this.services = services;
        this.finishFn = finish;
    }
}

const factories = new Map<PuzzleId, () => OverlayScreen>();

export function registerScreen(id: PuzzleId, factory: () => OverlayScreen): void {
    factories.set(id, factory);
}

export function createScreen(id: PuzzleId): OverlayScreen | null {
    return factories.get(id)?.() ?? null;
}

export interface OverlaySceneData {
    screen: OverlayScreen;
    services: OverlayServices;
    onFinish: (solved: boolean) => void;
}

/** Runs on top of LevelScene: dimmed background, panel, close button, and the screen itself. */
export class OverlayScene extends Scene {
    private data_: OverlaySceneData;
    private finished = false;
    private offDrop: (() => void) | null = null;

    constructor() {
        super('OverlayScene');
    }

    init(data: OverlaySceneData) {
        this.data_ = data;
        this.finished = false;
    }

    create() {
        const { screen, services } = this.data_;
        const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setOrigin(0, 0).setInteractive();
        dim.on('pointerdown', () => this.finish(false));   // click on the dimmed background closes

        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2 - 40;
        // The panel swallows clicks so they do not reach the background.
        this.add.rectangle(cx, cy, PANEL_W, PANEL_H, 0x1d2240, 1).setStrokeStyle(6, 0xf3e3b5).setInteractive();
        const container = this.add.container(cx, cy);

        const close = this.add.text(cx + PANEL_W / 2 - 20, cy - PANEL_H / 2 + 20, '✕', {
            fontFamily: 'sans-serif', fontSize: '56px', color: '#ffffff', backgroundColor: '#3a2d5a', padding: { x: 14, y: 2 },
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        close.on('pointerdown', () => this.finish(false));
        close.setName('overlay-close');

        screen.attach(this, services, solved => this.finish(solved));
        screen.create(container);
        this.offDrop = bus.on('item:drop', ({ itemId, x, y }) => screen.dropItem?.(itemId, { x, y }));
        this.events.once('shutdown', () => { this.offDrop?.(); this.offDrop = null; });
    }

    private finish(solved: boolean) {
        if (this.finished) return;
        this.finished = true;
        this.data_.screen.attach(this.data_.screen.scene, this.data_.services, null);
        const cb = this.data_.onFinish;
        const result = closeResult(solved, this.data_.screen);   // closing during the success animation still counts
        this.scene.stop();
        cb(result);
    }
}
