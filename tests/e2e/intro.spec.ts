import { expect, test } from '@playwright/test';
import type { GameObjects } from 'phaser';
import type { LevelScene } from '../../src/game/scenes/LevelScene';
import { expectNoErrors, openGame } from './helpers';

type DebugWindow = Window & { __levelScene?: LevelScene };

test('L01 intro decorates the tree, stops the clock and lands the sofa', async ({ page }) => {
    const game = await openGame(page);
    await page.click('[data-test=menu-start]');

    await page.waitForFunction(() => {
        const scene = (window as DebugWindow).__levelScene;
        const title = scene?.children.getByName('intro-title-lines') as GameObjects.Text | undefined;
        const markers = scene?.children.getByName('interaction-markers') as GameObjects.Container | undefined;
        return title?.text.split('\n').length === 4 && markers?.visible === false;
    });
    await expect(page.locator('[data-test=inventory]')).toBeHidden();

    await page.waitForFunction(() =>
        (window as DebugWindow).__levelScene?.ksyusha.anims.currentAnim?.key === 'ksyusha_intro_reach');
    const windowLights = () => page.evaluate(() => {
        const scene = (window as DebugWindow).__levelScene;
        return scene?.children.list.filter(o => o.name === 'window-snow' || o.name === 'window-lamp')
            .map(o => { const pixel = o as GameObjects.Rectangle; return [pixel.y, pixel.alpha]; });
    });
    const movingWindow = await windowLights();
    await expect.poll(windowLights, { timeout: 1600 }).not.toEqual(movingWindow);
    await page.waitForFunction(() => (window as DebugWindow).__levelScene?.isWalking);

    for (const value of ['23:50', '23:59']) {
        await page.waitForFunction(expected => {
            const scene = (window as DebugWindow).__levelScene;
            const clock = scene?.children.getByName('intro-clock-time') as GameObjects.Text | undefined;
            const texture = scene?.children.getByName('intro-clock-texture') as GameObjects.Image | undefined;
            const spawn = scene?.map.points.spawn;
            return scene && spawn && clock?.text === expected && texture?.texture.key === 'l01_clock_dial' &&
                Math.hypot(scene.position.x - spawn.x, scene.position.y - spawn.y) < 4;
        }, value);
    }
    await page.waitForFunction(() => {
        const scene = (window as DebugWindow).__levelScene;
        const sofa = scene?.getSprite('sofa');
        return sofa && sofa.y < 768 && scene?.children.getByName('sofa-flash');
    });
    await page.waitForFunction(() => {
        const scene = (window as DebugWindow).__levelScene;
        return scene?.ksyusha.anims.currentAnim?.key === 'ksyusha_intro_surprise' &&
            scene.children.getByName('intro-sofa-reaction');
    });
    await expect(page.locator('[data-test=inventory]')).toBeVisible();
    expect(await page.evaluate(() => {
        const scene = (window as DebugWindow).__levelScene;
        return {
            sofa: scene?.getSprite('sofa')?.y,
            running: scene?.isWalking,
            clockCard: Boolean(scene?.children.getByName('intro-clock-card')),
        };
    })).toEqual({ sofa: 768, running: false, clockCard: false });
    expectNoErrors(game.errors);
});

test('skipping while Ksyusha is walking returns control to the player', async ({ page }) => {
    const game = await openGame(page);
    await page.click('[data-test=menu-start]');
    await page.waitForFunction(() => (window as DebugWindow).__levelScene?.isWalking);
    await game.click(960, 540);
    await expect(page.locator('[data-test=inventory]')).toBeVisible();
    expect(await page.evaluate(() => {
        const scene = (window as DebugWindow).__levelScene;
        return scene && [scene.position, scene.map.points.spawn, scene.isWalking];
    })).toEqual([{ x: 380, y: 780 }, { x: 380, y: 780 }, false]);
    await page.waitForFunction(() => {
        const scene = (window as DebugWindow).__levelScene;
        const markers = scene?.children.getByName('interaction-markers') as GameObjects.Container | undefined;
        const fridge = markers?.getByName('fridge') as GameObjects.Graphics | undefined;
        return markers?.visible && fridge?.visible && !markers.getByName('ornament_box');
    });
    expectNoErrors(game.errors);
});
