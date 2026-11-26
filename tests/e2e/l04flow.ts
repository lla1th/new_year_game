import { expect } from '@playwright/test';
import type { LevelScene } from '../../src/game/scenes/LevelScene';
import type { Game } from './helpers';
import { ORDERS } from '../../src/puzzles/logic/cakes';
import { PIPE_START } from '../../src/puzzles/logic/glazeLine';

type DebugWindow = Window & { __levelScene?: LevelScene };

export async function walkL04(game: Game, direction: 'ArrowLeft' | 'ArrowRight', level: string, screen?: string) {
    await game.p.keyboard.down(direction);
    try {
        await game.p.waitForFunction(([levelId, screenId]) => {
            const s = (window as DebugWindow).__levelScene;
            return !!s && s.currentLevel?.levelId === levelId && (!screenId || s.currentScreenId === screenId);
        }, [level, screen], { timeout: 18000 });
    } finally {
        await game.p.keyboard.up(direction);
    }
    await game.settle();
}

export async function openL04Panel(game: Game, aspect: number) {
    const { p, click, overlay } = game;
    const panel = Math.round(1920 * aspect) * 0.59;
    await p.keyboard.down('ArrowRight');
    try {
        await p.waitForFunction(x => ((window as DebugWindow).__levelScene?.position.x ?? 0) > x - 115, panel);
    } finally {
        await p.keyboard.up('ArrowRight');
    }
    const x = await p.evaluate(world => world - ((window as DebugWindow).__levelScene?.cameras.main.scrollX ?? 0), panel);
    await click(x, 750);
    await overlay();
}

export async function playL04(game: Game) {
    const { p, click, overlayClosed } = game;
    await openL04Panel(game, 1.6);
    for (const recipe of ORDERS) {
        for (const [, ingredient] of recipe) await click(960 + (ingredient - 1) * 260, 729);
        await click(1105, 812);
        await p.waitForTimeout(660);
    }
    await overlayClosed();
    expect((await game.state())?.flags).toContain('L04_CAKES_DONE');
    await walkL04(game, 'ArrowRight', 'L04', 'sorting');

    await openL04Panel(game, 1.8);
    for (const [a, b] of [[8, 9], [9, 16], [8, 15], [5, 6], [4, 11], [3, 10], [17, 24], [25, 26]]) {
        for (const i of [a, b]) await click(485 + i % 7 * 75, 310 + Math.floor(i / 7) * 75);
        await p.waitForFunction(() => {
            const s = (window as DebugWindow).__levelScene;
            if (!s?.scene.isActive('OverlayScene')) return true;
            const overlay = s.scene.get('OverlayScene') as unknown as { data_: { screen: { busy: boolean } } };
            return !overlay.data_.screen.busy;
        });
    }
    await overlayClosed();
    expect((await game.state())?.flags).toContain('L04_SORT_DONE');
    await walkL04(game, 'ArrowRight', 'L04', 'technical');

    await playL04Glaze(game);
}

async function playL04Glaze(game: Game) {
    const { p, click, overlayClosed } = game;
    await openL04Panel(game, 1.5);
    for (const [i, rotation] of [[6, 0], [7, 0], [8, 2], [13, 0], [14, 2], [19, 1], [24, 0]]) {
        for (let n = 0; n < (rotation - PIPE_START[i] + 4) % 4; n++) {
            await click(780 + i % 5 * 88, 316 + Math.floor(i / 5) * 88);
            const expected = (PIPE_START[i] + n + 1) % 4;
            await expect.poll(() => p.evaluate(index => {
                const scene = (window as DebugWindow).__levelScene;
                const overlay = scene?.scene.get('OverlayScene') as unknown as { data_: { screen: { rotations: number[] } } };
                return overlay.data_.screen.rotations[index];
            }, i), { message: `Rotation at pipe ${i}, press ${n + 1}` }).toBe(expected);
        }
    }
    await click(1130, 770);
    await overlayClosed();
    expect((await game.state())?.flags).toContain('L04_PIPES_DONE');
    await walkL04(game, 'ArrowRight', 'L05', 'freezer');
}
