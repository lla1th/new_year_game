import { test, expect } from '@playwright/test';
import { expectNoErrors, openGame } from './helpers';
import { openL04Panel, playL04, walkL04 } from './l04flow';

test('factory rooms, modal focus and cold storage hand-off', async ({ page }) => {
    test.setTimeout(180_000);
    const game = await openGame(page);
    await page.evaluate(() => localStorage.setItem('onye-save-v1', JSON.stringify({
        version: 2, levelId: 'L04', screenId: null, flags: { L01_SPITZ_FREED: true },
        inventory: [], parts: ['PART_SPRING'], completed: false, savedAt: new Date().toISOString(), spitzName: 1, talksSeen: [],
    })));
    await page.reload();
    await page.click('[data-test=menu-continue]');
    await game.waitLevel('L04', 'factory');
    await openL04Panel(game, 1.6);
    await page.keyboard.press('Enter');
    await game.click(157, 510);
    await game.overlayClosed();
    await page.reload();
    await page.click('[data-test=menu-continue]');
    await game.waitLevel('L04', 'factory');
    await playL04(game);
    expect(await game.inv()).toContain('ITEM_MITTENS');
    expect((await game.state())?.flags).toEqual(expect.arrayContaining(['L04_CAKES_DONE', 'L04_SORT_DONE', 'L04_PIPES_DONE', 'L05_ENTERED']));
    expectNoErrors(game.errors);
});

test('a saved sorting checkpoint can return through the left threshold', async ({ page }) => {
    const game = await openGame(page);
    await page.evaluate(() => localStorage.setItem('onye-save-v1', JSON.stringify({
        version: 2, levelId: 'L04', screenId: 'sorting', flags: { L04_CAKES_DONE: true },
        inventory: [], parts: [], completed: false, savedAt: new Date().toISOString(), spitzName: null, talksSeen: [],
    })));
    await page.reload();
    await page.click('[data-test=menu-continue]');
    await game.waitLevel('L04', 'sorting');
    await walkL04(game, 'ArrowLeft', 'L04', 'factory');
    expect((await game.state())?.flags).toContain('L04_CAKES_DONE');
    expectNoErrors(game.errors);
});
