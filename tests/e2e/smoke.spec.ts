import { test, expect } from '@playwright/test';
import { expectNoErrors, openGame, startNewGame } from './helpers';

test('menu opens without console errors; «Начать» → L01; the intro can be skipped', async ({ page }) => {
    const game = await openGame(page);
    await expect(page.locator('[data-test=main-menu]')).toBeVisible();
    await expect(page.locator('[data-test=menu-continue]')).toHaveCount(0);
    await startNewGame(game);
    const st = await game.state();
    expect(st?.level).toBe('L01');
    expect(st?.busy).toBe(false);
    await expect(page.locator('[data-test=inventory]')).toBeVisible();
    expectNoErrors(game.errors);
});
