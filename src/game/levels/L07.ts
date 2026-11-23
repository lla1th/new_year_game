import type { LevelScript, Step } from '../script/types';

const refuse: Step[] = [{ say: 'cat', key: 'l07.cat.refuse' }, { anim: 'cat_turn' }];

/** L07 «Кошачья башня» (LEVEL_DESIGN.md L07, TASK-012/013; PUZZLE_SPECIFICATIONS.md P-07). */
export const L07: LevelScript = {
    levelId: 'L07',
    firstScreen: 'tower',
    goals: [
        { flag: 'L07_DRAWING_FOUND', hintKeys: ['hint.P-07.1', 'hint.P-07.1', 'hint.P-07.1'] },
        { flag: 'L07_CAT_RECONCILED', hintKeys: ['hint.P-07.2', 'hint.P-07.3', 'hint.P-07.3'] },
    ],
    screens: {
        tower: {
            map: 'assets/maps/L07.json',
            onEnter: [{
                ifFlag: 'L07_CAT_RECONCILED',
                then: [{ goto: { level: 'L08' } }],                       // "Continue" after the checkpoint
                else: [{ say: 'cat', key: 'l07.dlg.cat.1' }],
            }],
            hotspots: [
                {
                    hotspot: 'cat',
                    onUse: [{ say: 'cat', key: 'l07.dlg.cat.1' }],
                    onItem: {
                        ITEM_RIBBON: refuse,
                        ITEM_GINGER_MEDAL: refuse,
                        ITEM_KEEPER_MEDAL: [
                            { removeItem: 'ITEM_KEEPER_MEDAL' }, { dialog: 'l07_reconcile' },
                            { givePart: 'PART_HANDS' }, { setFlag: 'L07_CAT_RECONCILED' }, { checkpoint: true },
                            { anim: 'cat_portal' }, { goto: { level: 'L08' } },
                        ],
                    },
                },
                // The crumpled drawing: close-up; the first time → L07_DRAWING_FOUND and the spitz's line.
                {
                    hotspot: 'drawing',
                    onInspect: [{ openPuzzle: 'drawing' }, { ifFlag: 'L07_DRAWING_FOUND', then: [], else: [{ setFlag: 'L07_DRAWING_FOUND' }, { say: 'spitz', key: 'l07.dlg.spitz.1' }] }],
                    onUse: [{ openPuzzle: 'drawing' }, { ifFlag: 'L07_DRAWING_FOUND', then: [], else: [{ setFlag: 'L07_DRAWING_FOUND' }, { say: 'spitz', key: 'l07.dlg.spitz.1' }] }],
                },
                { hotspot: 'nika', when: 'L07_RIBBON_GIVEN', onUse: [{ say: 'nika', key: 'l07.nika.after' }] },
                {
                    hotspot: 'nika',
                    when: 'L07_DRAWING_FOUND',
                    onUse: [{ giveItem: 'ITEM_RIBBON' }, { setFlag: 'L07_RIBBON_GIVEN' }, { say: 'nika', key: 'l07.nika.give' }],
                },
                { hotspot: 'nika', onUse: [{ say: 'nika', key: 'l07.nika.early' }] },
                { hotspot: 'lekha', when: 'L07_MEDAL_GIVEN', onUse: [{ say: 'lekha', key: 'l07.lekha.after' }] },
                {
                    hotspot: 'lekha',
                    when: 'L07_DRAWING_FOUND',
                    onUse: [{ giveItem: 'ITEM_GINGER_MEDAL' }, { setFlag: 'L07_MEDAL_GIVEN' }, { say: 'lekha', key: 'l07.lekha.give' }],
                },
                { hotspot: 'lekha', onUse: [{ say: 'lekha', key: 'l07.lekha.early' }] },
            ],
        },
    },
};
