import type { LevelScript } from '../script/types';

/** L01 «31 декабря, 23:59» — prologue (LEVEL_DESIGN.md L01, TASK-001/002, PUZZLE_SPECIFICATIONS.md P-01). */
export const L01: LevelScript = {
    levelId: 'L01',
    firstScreen: 'apartment',
    goals: [
        { flag: 'L01_SPITZ_FREED', hintKeys: ['hint.P-01.1', 'hint.P-01.2', 'hint.P-01.3'] },
        { flag: 'L01_PORTAL_ENTERED', hintKeys: ['hint.l01.portal', 'hint.l01.portal', 'hint.l01.portal'] },
    ],
    screens: {
        apartment: {
            map: 'assets/maps/L01.json',
            onEnter: [{ cutscene: 'l01_intro' }],
            hotspots: [
                // Spitz under the sofa: P-01.
                {
                    hotspot: 'sofa',
                    unless: 'L01_SPITZ_FREED',
                    onUse: [{ say: 'ksyusha', key: 'l01.sofa.use' }],
                    onItem: {
                        ITEM_MANDARIN: [
                            { sfx: 'sfx_spitz_sneeze' },
                            { say: 'spitz', key: 'l01.sofa.mandarin' },
                            { say: 'ksyusha', key: 'l01.sofa.mandarin2' },
                        ],
                        ITEM_SAUSAGE: [
                            { removeItem: 'ITEM_SAUSAGE' },
                            { say: 'spitz', key: 'l01.sofa.sausage' },
                            { anim: 'spitz_out' },
                            { setFlag: 'L01_SPITZ_FREED' },
                            { dialog: 'l01_intro' },
                            { setFlag: 'L01_PORTAL_OPEN' },
                            { checkpoint: true },   // P-01 solved (autosave after every puzzle)
                        ],
                    },
                },
                { hotspot: 'sofa', onInspect: [{ say: 'ksyusha', key: 'l01.sofa.freed.inspect' }] },
                // Mandarin: once (the source is "done" while the mandarin is in the inventory).
                { hotspot: 'table', onUse: [{ giveItem: 'ITEM_MANDARIN' }, { say: 'ksyusha', key: 'l01.table.take' }] },
                { hotspot: 'fridge', onUse: [{ sfx: 'sfx_fridge' }, { openPuzzle: 'fridge' }] },
                // Portal: only after the dialog.
                {
                    hotspot: 'terrarium',
                    when: 'L01_PORTAL_OPEN',
                    onInspect: [{ say: 'ksyusha', key: 'l01.terrarium.portal.inspect' }],
                    onUse: [{ setFlag: 'L01_PORTAL_ENTERED' }, { anim: 'portal' }, { goto: { level: 'L02' } }],
                },
            ],
        },
    },
};
