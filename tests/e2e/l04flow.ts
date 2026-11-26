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

async function approachL04(game: Game, aspect: number, fraction: number) {
    const { p } = game;
    const x = Math.round(1920 * aspect) * fraction;
    const current = await p.evaluate(() => (window as DebugWindow).__levelScene?.position.x ?? 0);
    if (Math.abs(x - current) > 40) {
        const key = current < x ? 'ArrowRight' : 'ArrowLeft';
        await p.keyboard.down(key);
        try {
            await p.waitForFunction(target => Math.abs(((window as DebugWindow).__levelScene?.position.x ?? 0) - target) < 42, x);
        } finally {
            await p.keyboard.up(key);
        }
    }
    return p.evaluate(world => world - ((window as DebugWindow).__levelScene?.cameras.main.scrollX ?? 0), x);
}

async function useTarget(game: Game, aspect: number, fraction: number) {
    const x = await approachL04(game, aspect, fraction);
    await game.act(() => game.click(x, 750));
}

async function solveDeduction(game: Game, aspect: number, fraction: number, answer: number, wrong?: number) {
    const x = await approachL04(game, aspect, fraction);
    await game.click(x, 750);
    await game.overlay();
    if (wrong !== undefined) {
        await game.click(960, 528 + wrong * 69);
        await expect.poll(() => game.p.evaluate(() => {
            const level = (window as DebugWindow).__levelScene;
            const overlay = level?.scene.get('OverlayScene') as unknown as { data_: { screen: { feedback: string } } };
            return overlay.data_.screen.feedback;
        })).not.toBe('');
    }
    await game.click(960, 528 + answer * 69);
    await game.overlayClosed();
}

async function openL04Panel(game: Game, aspect: number) {
    const x = await approachL04(game, aspect, 0.59);
    await game.click(x, 750);
    await game.overlay();
}

export async function playL04(game: Game) {
    const { p, click, overlayClosed } = game;
    await solveDeduction(game, 1.6, 0.28, 2, 0);
    await useTarget(game, 1.6, 0.50);
    await useTarget(game, 1.6, 0.79);
    await openL04Panel(game, 1.6);
    for (const recipe of ORDERS) {
        for (const [, ingredient] of recipe) await click(960 + (ingredient - 1) * 260, 729);
        await click(1105, 812);
        await p.waitForTimeout(660);
    }
    await overlayClosed();
    expect((await game.state())?.flags).toContain('L04_CAKES_DONE');
    await walkL04(game, 'ArrowRight', 'L04', 'sorting');

    await solveDeduction(game, 1.8, 0.29, 0);
    await useTarget(game, 1.8, 0.50);
    await useTarget(game, 1.8, 0.79);
    await walkL04(game, 'ArrowLeft', 'L04', 'factory');
    await solveDeduction(game, 1.6, 0.50, 1);
    await walkL04(game, 'ArrowRight', 'L04', 'sorting');
    await useTarget(game, 1.8, 0.50);
    expect((await game.state())?.flags).toContain('L04_RECONCILED');
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
    await useTarget(game, 1.5, 0.49);
    await solveDeduction(game, 1.5, 0.785, 3);
    await useTarget(game, 1.5, 0.30);
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
