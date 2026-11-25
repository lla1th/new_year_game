import { test, expect } from '@playwright/test';
import type { LevelScene } from '../../src/game/scenes/LevelScene';
import { expectNoErrors, openGame, startNewGame } from './helpers';

type DebugWindow = Window & { __levelScene?: LevelScene };

test('menu opens without console errors; «Начать» → L01; the intro can be skipped', async ({ page }) => {
    const game = await openGame(page);
    await expect(page.locator('[data-test=main-menu]')).toBeVisible();
    await expect(page.locator('[data-test=menu-continue]')).toHaveCount(0);
    await startNewGame(game);
    const st = await game.state();
    expect(st?.level).toBe('L01');
    expect(st?.busy).toBe(false);
    await expect(page.locator('[data-test=inventory]')).toBeVisible();

    const sprite = () => page.evaluate(() => {
        const scene = (window as DebugWindow).__levelScene;
        const ksyusha = scene?.ksyusha;
        return ksyusha && {
            texture: ksyusha.texture.key,
            animation: ksyusha.anims.currentAnim?.key,
            frame: Number(ksyusha.frame.name),
            scale: ksyusha.scaleX,
            originY: ksyusha.originY,
        };
    });
    const pixelSprite = { texture: 'ksyusha_w1', scale: 4, originY: 1 };
    await expect.poll(sprite).toMatchObject(pixelSprite);
    await game.click(900, 850);
    await expect.poll(sprite).toMatchObject({ ...pixelSprite, animation: 'ksyusha_w1_r_walk' });
    await expect.poll(async () => (await sprite())?.frame).toBeGreaterThanOrEqual(12);
    await expect.poll(sprite).toEqual({ ...pixelSprite, animation: 'ksyusha_w1_r_idle', frame: 2 });

    await page.waitForFunction(() =>
        (window as DebugWindow).__levelScene?.ksyusha.anims.currentAnim?.key === 'ksyusha_w1_r_blink',
    null, { timeout: 9000 });
    await expect.poll(async () => (await sprite())?.animation, { timeout: 18000 }).toBe('ksyusha_w1_r_phone');
    await expect.poll(async () => (await sprite())?.frame).toBeGreaterThanOrEqual(30);
    await game.click(450, 850);
    await expect.poll(sprite).toMatchObject({ ...pixelSprite, animation: 'ksyusha_w1_l_walk' });
    expectNoErrors(game.errors);
});
