import { test, expect } from '@playwright/test';
import type { GameObjects } from 'phaser';
import type { LevelScene } from '../../src/game/scenes/LevelScene';
import { expectNoErrors, openGame, startNewGame } from './helpers';

type DebugWindow = Window & { __levelScene?: LevelScene };

test('freeing the spitz is saved; «Продолжить» brings it back; a broken save hides «Продолжить»', async ({ page }) => {
    test.setTimeout(300_000);
    const game = await openGame(page);
    const { p } = game;
    await startNewGame(game);
    await game.act(() => game.click(1440, 680));                                // the table → mandarin
    await game.act(() => game.click(1710, 400));                                // the fridge close-up
    await game.overlay();
    await game.click(840, 540); await game.settle();                            // the sausage
    await game.click(60, 1040); await game.overlayClosed();                     // close by the background
    expect(await game.inv()).toEqual(['ITEM_MANDARIN', 'ITEM_SAUSAGE']);
    await game.act(async () => game.drag(await game.slot('ITEM_SAUSAGE'), 690, 620));   // sausage → sofa
    expect((await game.state())?.flags).toContain('L01_SPITZ_FREED');

    await game.click(1200, 888);
    await expect.poll(() => p.evaluate(() => {
        const scene = (window as DebugWindow).__levelScene;
        const k = scene?.ksyusha;
        const sp = scene?.spitz;
        const shadows = scene?.children.list.filter(child => child.type === 'Ellipse') ?? [];
        return {
            animation: sp?.anims.currentAnim?.key,
            grounded: [k, sp].every(actor => actor && shadows.some(shadow => {
                const ellipse = shadow as GameObjects.Ellipse;
                return ellipse.visible && ellipse.alpha > 0 &&
                    ellipse.x === actor.x && ellipse.y === actor.y - 1;
            })),
        };
    })).toEqual({ animation: 'spitz_w1_walk', grounded: true });
    await game.settle();
    await expect.poll(() => p.evaluate(() => (window as DebugWindow).__levelScene?.spitz?.anims.currentAnim?.key))
        .toBe('spitz_w1_idle');

    await p.reload();
    await p.click('[data-test=menu-continue]');
    await game.waitLevel('L01');
    const st = await game.state();
    expect(st?.flags).toContain('L01_SPITZ_FREED');
    expect(st?.flags).toContain('L01_PORTAL_OPEN');
    expect(await game.inv()).toEqual(['ITEM_MANDARIN']);

    await p.evaluate(() => localStorage.setItem('onye-save-v1', '{broken'));
    await p.reload();
    await expect(p.locator('[data-test=main-menu]')).toBeVisible();
    await expect(p.locator('[data-test=menu-continue]')).toHaveCount(0);
    expectNoErrors(game.errors);
});
