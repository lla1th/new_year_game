import { describe, test, expect } from 'vitest';
import { L04, l04SaveScreen } from '../../src/game/levels/L04';
import { CakeOrders, ORDERS } from '../../src/puzzles/logic/cakes';
import { CandySort, candyMatches, candyMoves } from '../../src/puzzles/logic/candySort';
import { PIPE_START, traceGlaze } from '../../src/puzzles/logic/glazeLine';
import { allSteps, harness, ru } from './harness';

describe('L04 «Кондитерский завод»', () => {
    test('supplies, reconciliation, and each mini-game gate the next room', async () => {
        const h = harness(L04);
        await h.click('panel');
        expect(h.log).not.toContain('puzzle:l04-cakes');
        await h.click('bag');
        await h.click('ginger');
        await h.click('panel');
        expect(h.log.at(-1)).toBe('say:ksyusha:l04.quest.need_cake_mold');
        await h.click('mold');
        await h.click('panel');
        await h.click('right');
        expect(h.screen).toBe('sorting');

        await h.click('fuse');
        await h.click('klava');
        await h.click('left');
        await h.click('ginger');
        expect(h.state.hasFlag('L04_SORT_KEY')).toBe(false);
        await h.click('right');
        await h.click('note');
        await h.click('left');
        await h.click('ginger');
        expect(h.state.hasFlag('L04_SORT_KEY')).toBe(true);
        await h.click('right');
        await h.click('panel');
        expect(h.log).not.toContain('puzzle:l04-candy');
        await h.click('klava');
        expect(h.state.hasFlag('L04_RECONCILED')).toBe(true);
        await h.click('panel');
        await h.click('right');
        expect(h.screen).toBe('technical');

        await h.click('lekha');
        await h.click('belt');
        await h.click('panel');
        expect(h.log).not.toContain('puzzle:P-04');
        await h.click('gasket');
        await h.click('panel');
        expect(h.state.hasItem('ITEM_MITTENS')).toBe(true);
        await h.click('right');
        expect(h.log.at(-1)).toBe('goto:L05:');
    });

    test('unfinished attempts keep the right door locked and the left door usable', async () => {
        const h = harness(L04, { puzzles: { 'l04-candy': false } });
        await h.enter('sorting');
        for (const [flag] of L04.screens.sorting.sideRoom!.tasks) h.state.setFlag(flag);
        await h.click('panel');
        expect(h.log).toContain('puzzle:l04-candy');
        expect(h.state.hasFlag('L04_SORT_DONE')).toBe(false);
        await h.click('right');
        expect(h.screen).toBe('sorting');
        await h.click('left');
        expect(h.screen).toBe('factory');
    });

    test('closing deduction panels keeps parts and the key unavailable', async () => {
        const h = harness(L04, { puzzles: { 'l04-mold': false, 'l04-fuse': false, 'l04-belt': false, 'l04-key-story': false } });
        await h.click('mold');
        expect(h.state.hasFlag('L04_CAKE_MOLD')).toBe(false);
        h.state.setFlag('L04_CAKES_DONE');
        await h.enter('sorting');
        await h.click('fuse');
        expect(h.state.hasFlag('L04_SORT_FUSE')).toBe(false);
        await h.click('klava');
        await h.click('note');
        await h.click('left');
        await h.click('ginger');
        expect(h.log).toContain('puzzle:l04-key-story');
        expect(h.state.hasFlag('L04_SORT_KEY')).toBe(false);
        await h.enter('technical');
        await h.click('belt');
        expect(h.state.hasFlag('L04_BELT')).toBe(false);
    });

    test('each line in the quest has a Russian text entry', () => {
        for (const step of allSteps(L04)) if ('say' in step) expect(ru[step.key], step.key).toBeTruthy();
    });

    test('legacy completed saves resume by the unlocked exit', () => {
        expect(l04SaveScreen('factory', f => f === 'L04_PIPES_DONE')).toBe('technical');
        expect(l04SaveScreen('sorting', () => false)).toBe('sorting');
        expect(l04SaveScreen(undefined, () => false)).toBe('factory');
    });

    test('cake correction keeps the valid prefix and already accepted orders', () => {
        const cakes = new CakeOrders();
        cakes.add(0);
        cakes.add(0);
        expect(cakes.submit()).toBe(1);
        expect(cakes.layers).toEqual([0]);
        cakes.add(1);
        expect(cakes.submit()).toBe('correct');
        for (const recipe of ORDERS.slice(1)) {
            for (const [, ingredient] of recipe) cakes.add(ingredient);
            expect(cakes.submit()).toBe('correct');
        }
        expect(cakes.complete).toBe(true);
    });

    test('each valid first swap has a reproducible solution inside the budget', () => {
        const routes = [
            [[1, 8], [0, 1], [14, 21], [1, 8], [14, 15], [9, 16], [3, 10], [22, 23], [43, 44], [30, 37]],
            [[8, 9], [9, 16], [8, 15], [5, 6], [4, 11], [3, 10], [17, 24], [25, 26]],
        ];
        expect(candyMoves(new CandySort().board)).toEqual(routes.map(r => r[0]));
        for (const route of routes) {
            const candy = new CandySort();
            expect(candy.play(0, 1)).toBeNull();
            for (const [a, b] of route) {
                expect(candyMatches(candy.board)).toEqual([]);
                expect(candy.play(a, b)).not.toBeNull();
            }
            expect(candy.won).toBe(true);
            expect(candy.moves).toBe(18 - route.length);
        }
    });

    test('glaze begins with two connected pipes and reaches the outlet on the nine-tile route', () => {
        expect(traceGlaze(PIPE_START)).toEqual({ path: [0, 1], won: false, leak: 1 });
        const rotations = [...PIPE_START];
        for (const [index, rotation] of [[6, 0], [7, 0], [8, 2], [13, 0], [14, 2], [19, 1], [24, 0]]) rotations[index] = rotation;
        expect(traceGlaze(rotations)).toEqual({ path: [0, 1, 6, 7, 8, 13, 14, 19, 24], won: true, leak: null });
    });
});
