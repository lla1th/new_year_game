import { test, expect } from '@playwright/test';
import { expectNoErrors, openGame, startNewGame } from './helpers';

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
