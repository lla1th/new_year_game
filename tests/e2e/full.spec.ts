import { test, expect } from '@playwright/test';
import { solveBoard } from '../../src/puzzles/logic/fifteen';
import { expectNoErrors, openGame, startNewGame } from './helpers';

/**
 * The whole game through the UI (clicks and drags at hotspot coordinates taken from the Tiled maps), no debug panel:
 * L01 → … → L08 → card → credits → post-credits → main menu with the level select.
 */
test('full playthrough L01 → post-credits → main menu with the level select', async ({ page }) => {
    test.setTimeout(40 * 60_000);
    const game = await openGame(page);
    const { p, click, drag, act, slot, overlay, overlayClosed, waitLevel, settle } = game;
    const g = async (x: number, y: number) => {
        const r = (await p.locator('canvas').boundingBox())!;
        return { x: r.x + (x * r.width) / 1920, y: r.y + (y * r.height) / 1080 };
    };

    // ---- L01
    await startNewGame(game);
    await act(() => click(1440, 680));
    await act(() => click(1710, 400)); await overlay(); await click(840, 540); await settle(); await click(60, 1040); await overlayClosed();
    await act(async () => drag(await slot('ITEM_MANDARIN'), 690, 620));
    await act(async () => drag(await slot('ITEM_SAUSAGE'), 690, 620));
    await act(() => click(1080, 360));
    await waitLevel('L02');
    // ---- L02
    for (const [x, y] of [[230, 430], [1380, 490], [1680, 410], [1605, 675]]) await act(() => click(x, y));
    await act(async () => drag(await slot('ITEM_MANDARIN'), 1380, 490));
    await act(() => click(960, 250)); await overlay();
    for (const [it, x] of [['ITEM_BULB_GREEN', 760], ['ITEM_BULB_GOLD', 960], ['ITEM_BULB_BLUE', 1360]] as const) { await drag(await slot(it), x, 520); await p.waitForTimeout(400); }
    await overlayClosed();
    await act(async () => drag(await slot('ITEM_GATE_KEY'), 530, 360));
    await act(() => click(530, 360));
    await waitLevel('L03', 'square');
    // ---- L03
    await act(() => click(960, 430)); await act(() => click(960, 430));
    await waitLevel('L03', 'floor1');
    await act(() => click(500, 360)); await overlay(); await click(60, 1040); await overlayClosed();
    await act(async () => drag(await slot('ITEM_COCOA'), 1220, 535));
    await act(() => click(1440, 300));
    await waitLevel('L03', 'top');
    await act(() => click(960, 450)); await overlay();
    for (const x of [1080, 600, 1320, 840]) { await click(x, 620); await p.waitForTimeout(500); }
    await waitLevel('L04');
    // ---- L04
    await act(() => click(680, 370));
    await act(async () => drag(await slot('ITEM_CANDY_CANE'), 1080, 680));
    await act(async () => drag(await slot('ITEM_VALVE'), 190, 440));
    await act(() => click(190, 440)); await overlay();
    const T = (c: number, r: number) => [960 + (c - 1.5) * 150, 470 + (r - 1.5) * 150] as const;
    const start: Record<string, number> = { '0,0': 1, '1,0': 0, '1,1': 0, '1,2': 2, '2,2': 3, '2,3': 1, '3,3': 1 };
    const want: Record<string, number> = { '0,0': 0, '1,0': 2, '1,1': 1, '1,2': 0, '2,2': 2, '2,3': 0, '3,3': 0 };
    for (const k of Object.keys(want)) {
        const [c, r] = k.split(',').map(Number);
        for (let i = 0; i < (want[k] - start[k] + 4) % 4; i++) { await click(...T(c, r)); await p.waitForTimeout(250); }
    }
    await overlayClosed();
    await act(() => click(1760, 420));
    await waitLevel('L05');
    // ---- L05
    await act(() => click(960, 810)); await overlay();
    const C = (x: number, y: number) => [960 + (x - 2) * 124, 460 + (y - 2) * 124] as const;
    const arrow = (x: number, y: number, d: 'up' | 'down' | 'left' | 'right') => {
        const o = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d]; const [cx, cy] = C(x, y);
        return [cx + o[0] * 124 * 0.62, cy + o[1] * 124 * 0.62] as const;
    };
    for (const [x, y, d] of [[0, 4, 'right'], [3, 4, 'up'], [4, 4, 'up'], [4, 3, 'left'], [1, 3, 'up']] as const) {
        await click(...C(x, y)); await p.waitForTimeout(250); await click(...arrow(x, y, d)); await p.waitForTimeout(1200);
    }
    await waitLevel('L06');
    // ---- L06
    await act(() => click(710, 250)); await overlay();
    const S = [[748, 318], [1172, 318], [748, 642], [1172, 642]] as const;
    for (const [i, j] of [[0, 1], [1, 3], [2, 3]] as const) {
        const a = await g(S[i][0], S[i][1]); const t = await g(S[j][0], S[j][1]);
        await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(t.x, t.y, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
    }
    await overlayClosed();
    await act(() => click(1250, 760));
    await waitLevel('L07');
    // ---- L07
    await act(() => click(1700, 565)); await overlay(); await click(60, 1040); await overlayClosed();
    await act(() => click(270, 490)); await act(() => click(470, 490));
    {
        const a = (await p.locator(`[data-slot="${await slot('ITEM_GINGER_MEDAL')}"]`).boundingBox())!;
        const t = (await p.locator(`[data-slot="${await slot('ITEM_RIBBON')}"]`).boundingBox())!;
        await p.mouse.move(a.x + 50, a.y + 50); await p.mouse.down(); await p.mouse.move(a.x + 70, a.y + 30, { steps: 3 });
        await p.mouse.move(t.x + 50, t.y + 50, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(400);
    }
    expect(await game.inv()).toEqual(['ITEM_KEEPER_MEDAL']);
    await act(async () => drag(await slot('ITEM_KEEPER_MEDAL'), 1410, 490));
    await waitLevel('L08');
    // ---- L08
    await act(() => click(960, 350)); await overlay();
    const dragPart = async (part: string, x: number, y: number) => {
        const s = (await p.locator(`[data-part="${part}"]`).boundingBox())!; const t = await g(x, y);
        await p.mouse.move(s.x + s.width / 2, s.y + s.height / 2); await p.mouse.down();
        await p.mouse.move(s.x + 60, s.y + 60, { steps: 4 }); await p.mouse.move(t.x, t.y, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(400);
    };
    await dragPart('PART_SPRING', 700, 560); await dragPart('PART_GEAR', 960, 660); await dragPart('PART_HANDS', 1220, 560);
    await p.waitForFunction(() => !(window as unknown as { __levelScene: { scene: { isActive(k: string): boolean } } }).__levelScene.scene.isActive('OverlayScene'), null, { timeout: 30_000 });
    await p.waitForTimeout(3000); await click(960, 540);            // skip midnight
    await settle();
    await act(() => click(630, 760)); await overlay();
    // P-08 by hand: the moves are computed from the board on screen and clicked one by one
    const board = await p.evaluate(() => (window as unknown as { __levelScene: { screens: Map<string, { board: number[] }> } }).__levelScene.screens.get('P-08')!.board);
    const cell = (i: number) => [960 - 120 + ((i % 3) - 1) * 220, 500 - 30 + (Math.floor(i / 3) - 1) * 220] as const;
    for (const idx of solveBoard(board)) { await click(...cell(idx)); await p.waitForTimeout(350); }
    // ---- ending
    await expect(p.locator('[data-test=ending-card]')).toBeVisible({ timeout: 60_000 });
    await p.locator('[data-test=ending-next]').click({ timeout: 30_000 });
    await expect(p.locator('[data-test=credits]')).toContainText('Сделано с любовью для Ксюши');
    await p.waitForTimeout(1500);
    await p.locator('[data-test=credits]').click();
    await expect(p.locator('[data-test=dialog-text]')).toBeVisible({ timeout: 60_000 });
    await settle().catch(() => {});
    await expect(p.locator('[data-test=main-menu]')).toBeVisible({ timeout: 30_000 });
    await expect(p.locator('[data-test=menu-levels]')).toBeVisible();
    expectNoErrors(game.errors);
});
