import { expect, type Page } from '@playwright/test';

/**
 * Helpers for driving the game through its UI. `?debug=1` is used only for the read-only window.__levelScene
 * handle (waiting until the scene is idle); the debug panel is never touched in the full playthrough.
 */
export interface Game {
    p: Page;
    errors: string[];
    click: (x: number, y: number) => Promise<void>;
    drag: (slot: number, x: number, y: number) => Promise<void>;
    inv: () => Promise<string[]>;
    slot: (item: string) => Promise<number>;
    state: () => Promise<{ busy: boolean; walking: boolean; level: string | null; screen: string; flags: string[]; parts: string[] } | null>;
    settle: (max?: number) => Promise<'idle' | 'overlay'>;
    act: (fn: () => Promise<unknown>) => Promise<'idle' | 'overlay'>;
    waitLevel: (level: string, screen?: string) => Promise<void>;
    overlay: () => Promise<void>;
    overlayClosed: () => Promise<void>;
}

export async function openGame(p: Page, query = '?debug=1'): Promise<Game> {
    const errors: string[] = [];
    p.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    p.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    await p.goto(query);
    const g = async (x: number, y: number) => {
        const r = (await p.locator('canvas').boundingBox())!;
        return { x: r.x + (x * r.width) / 1920, y: r.y + (y * r.height) / 1080 };
    };
    const click = async (x: number, y: number) => { const c = await g(x, y); await p.mouse.click(c.x, c.y); };
    const drag = async (slot: number, x: number, y: number) => {
        const s = (await p.locator(`[data-slot="${slot}"]`).boundingBox())!;
        const t = await g(x, y);
        await p.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
        await p.mouse.down();
        await p.mouse.move(s.x + s.width / 2 + 20, s.y - 20, { steps: 3 });
        await p.mouse.move(t.x, t.y, { steps: 8 });
        await p.mouse.up();
    };
    const inv = () => p.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-slot]')].map(e => e.dataset.item ?? '').filter(Boolean));
    const slot = async (item: string) => (await inv()).indexOf(item);
    const state = () => p.evaluate(() => {
        const s = (window as unknown as { __levelScene?: any }).__levelScene;   // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!s || !s.ksyusha) return null;
        const st = s.registryState();
        return { busy: s.isBusy, walking: s.isWalking, level: s.currentLevel?.levelId ?? null, screen: s.currentScreenId, flags: Object.keys(st.flags), parts: [...st.parts] };
    });
    const overlayActive = () => p.evaluate(() => !!(window as unknown as { __levelScene?: { scene: { isActive(k: string): boolean } } }).__levelScene?.scene.isActive('OverlayScene'));
    let maratTried = false;
    /** Clicks through every line that appears until the scene is idle (or an overlay screen is open). */
    const settle = async (max = 120_000): Promise<'idle' | 'overlay'> => {
        const t0 = Date.now();
        let quiet = 0;
        while (Date.now() - t0 < max) {
            // The name screen of L01: «Марат» is locked (the screen stays), then the first name is chosen.
            const nameScreen = p.locator('[data-test=name-choice]');
            if (!(await p.locator('[data-test=dialog]').count()) && await nameScreen.count()) {
                quiet = 0;
                if (!maratTried) {
                    maratTried = true;
                    await p.locator('[data-test=name-3]').click({ force: true });
                    await p.waitForTimeout(300);
                    continue;
                }
                await p.locator('[data-test=name-1]').click({ force: true });
                await p.waitForTimeout(300);
                continue;
            }
            const d = p.locator('[data-test=dialog]');
            if (await d.count()) {
                quiet = 0;
                await d.click({ force: true, timeout: 1000 }).catch(() => {});
                await p.waitForTimeout(60);
                await d.click({ force: true, timeout: 1000 }).catch(() => {});
                await p.waitForTimeout(120);
                continue;
            }
            if (await overlayActive()) return 'overlay';
            const st = await state();
            if (st && !st.busy && !st.walking) { if (++quiet >= 3) return 'idle'; } else quiet = 0;
            await p.waitForTimeout(200);
        }
        throw new Error(`settle timeout ${JSON.stringify(await state())}`);
    };
    const act = async (fn: () => Promise<unknown>) => {
        await fn();
        await p.waitForFunction(() => {
            const s = (window as unknown as { __levelScene?: any }).__levelScene;   // eslint-disable-line @typescript-eslint/no-explicit-any
            return !!document.querySelector('[data-test=dialog]') || (s && (s.isBusy || s.isWalking || s.scene.isActive('OverlayScene')));
        }, null, { timeout: 4000 }).catch(() => {});
        return settle();
    };
    const waitLevel = async (level: string, screen?: string) => {
        await p.waitForFunction(([l, sc]) => {
            const x = (window as unknown as { __levelScene?: any }).__levelScene;   // eslint-disable-line @typescript-eslint/no-explicit-any
            return x && x.currentLevel?.levelId === l && (!sc || x.currentScreenId === sc) && x.ksyusha && !x.isBusy;
        }, [level, screen ?? ''] as const, { timeout: 180_000 }).catch(() => {});
        await settle();
    };
    const overlay = async () => {
        await p.waitForFunction(() => (window as unknown as { __levelScene?: any }).__levelScene?.scene.isActive('OverlayScene'), null, { timeout: 120_000 });   // eslint-disable-line @typescript-eslint/no-explicit-any
        await p.waitForTimeout(800);
    };
    const overlayClosed = async () => {
        await p.waitForFunction(() => !(window as unknown as { __levelScene?: any }).__levelScene?.scene.isActive('OverlayScene'), null, { timeout: 30_000 });   // eslint-disable-line @typescript-eslint/no-explicit-any
        await act(async () => {});
    };
    return { p, errors, click, drag, inv, slot, state, settle, act, waitLevel, overlay, overlayClosed };
}

/** Console errors that are not the game's fault (none expected). */
export function expectNoErrors(errors: string[]): void {
    expect(errors, errors.join('\n')).toEqual([]);
}

/** Start a new game and skip the intro cutscene. */
export async function startNewGame(game: Game): Promise<void> {
    const { p } = game;
    await p.click('[data-test=menu-start]');
    const confirm = p.locator('[data-test=confirm-yes]');
    if (await confirm.count()) await confirm.click();
    await p.waitForFunction(() => (window as unknown as { __levelScene?: any }).__levelScene?.ksyusha, null, { timeout: 60_000 });   // eslint-disable-line @typescript-eslint/no-explicit-any
    await p.waitForTimeout(1200);
    await game.click(960, 540);   // skips the cutscene
    await game.settle();
}
