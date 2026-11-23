import { test, expect } from '@playwright/test';
import { expectNoErrors, openGame, startNewGame } from './helpers';
import { playL02 } from './l02flow';

test('L02 «Ярмарка» is playable through the UI up to the teleporter; the cocoa travels to L03', async ({ page }) => {
    test.setTimeout(8 * 60_000);
    const game = await openGame(page);
    const { p } = game;
    await startNewGame(game);
    // the debug panel is allowed here only to skip L01 (the full playthrough plays it for real)
    await p.click('.toggle');
    await p.selectOption('[data-test=dbg-level]', 'L02');
    await p.click('[data-test=dbg-goto]');
    await playL02(game);
    expect(await game.inv()).toContain('ITEM_COCOA');
    expectNoErrors(game.errors);
});
