import type { Game } from './helpers';

/**
 * L02 «Ярмарка» through the UI, starting on the screen before the gate and ending on L03 «square».
 * Coordinates are the centres of the hotspots of public/assets/maps/L02_*.json (the game is 1920×1080).
 * The shooting gallery is skipped (it is optional): Nika then adds her «stroll» line, which `settle` clicks through.
 */
export async function playL02(game: Game): Promise<void> {
    const { p, click, drag, act, slot, overlay, waitLevel } = game;
    let n = 0;
    const mark = async () => { if (process.env.E2E_TRACE) console.log(`[l02 step ${++n}]`, JSON.stringify(await game.state()), (await game.inv()).join(',')); };
    const go = async (x: number, y: number) => { const r = await act(() => click(x, y)); await mark(); return r; };
    const give = async (item: string, x: number, y: number) => { const r = await act(async () => drag(await slot(item), x, y)); await mark(); return r; };

    await waitLevel('L02', 'gate');
    // gate: foil from the urn → the monkey's crate → the key → the gate
    await go(370, 550);
    await give('ITEM_FOIL', 1040, 570);
    await give('ITEM_GATE_KEY', 1660, 300);
    await go(1660, 300);
    await waitLevel('L02', 'entrance');
    // entrance: the lantern bulb, then the tent (the cat scene), then the key booth
    await go(870, 440);
    await go(1800, 450);
    await waitLevel('L02', 'square');
    await go(910, 380);
    await waitLevel('L02', 'tent');
    await go(140, 450);
    await waitLevel('L02', 'square');
    await go(130, 450);
    await waitLevel('L02', 'entrance');
    await go(1260, 450);
    await go(1800, 450);
    await waitLevel('L02', 'square');
    // square: yellow bulb, blue bulb (the carousel), the pump, the shed
    await go(380, 460);
    await go(1390, 470);
    await go(1410, 670);
    await go(1660, 610);
    await give('ITEM_SHED_KEY', 1770, 360);
    await go(1770, 360);
    await waitLevel('L02', 'shed');
    // shed: fill the pump at the barrel, then the generator
    await give('ITEM_PUMP', 1400, 500);
    await go(970, 410);
    await overlay();
    // the screen is centred at (960, 500): sockets (660/960/1260, 360), the tank (560, 670), the cord (1360, 670)
    await p.waitForTimeout(500);
    for (const [item, x] of [['ITEM_BULB_RED', 660], ['ITEM_BULB_YELLOW', 960], ['ITEM_BULB_BLUE', 1260]] as const) {
        await drag(await slot(item), x, 360);
        await p.waitForTimeout(400);
    }
    await drag(await slot('ITEM_PUMP'), 560, 670);
    await p.waitForTimeout(400);
    await click(1360, 670);
    await game.settle();
    // back to the tent: Nika thaws, the cocoa, the teleporter
    await go(140, 450);
    await waitLevel('L02', 'square');
    await go(910, 380);
    await waitLevel('L02', 'tent');
    await go(1100, 440);
    await go(1520, 420);
    await waitLevel('L03', 'square');
}
