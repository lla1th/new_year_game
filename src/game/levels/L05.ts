import type { LevelScript } from '../script/types';

/** L05 «Морозильный склад» (LEVEL_DESIGN.md L05, TASK-010; PUZZLE_SPECIFICATIONS.md P-05). */
export const L05: LevelScript = {
    levelId: 'L05',
    firstScreen: 'freezer',
    goals: [
        { flag: 'L05_CRATES_DONE', hintKeys: ['hint.P-05.1', 'hint.P-05.2', 'hint.P-05.3'] },
    ],
    screens: {
        freezer: {
            map: 'assets/maps/L05.json',
            onEnter: [{
                ifFlag: 'L05_CRATES_DONE',
                then: [{ goto: { level: 'L06' } }],          // "Continue" after the checkpoint
                else: [{
                    ifItem: 'ITEM_MITTENS',
                    then: [{ setFlag: 'L05_ENTERED' }, { say: 'ksyusha', key: 'l05.mittens.on' }],
                    else: [{ say: 'ksyusha', key: 'l05.no_mittens' }, { goto: { level: 'L04' } }],
                }],
            }],
            hotspots: [
                {
                    hotspot: 'ice_floor',
                    onUse: [{
                        openPuzzle: 'P-05',
                        onSolved: [
                            { cutscene: 'l05_cat' }, { givePart: 'PART_GEAR' }, { setFlag: 'L05_CRATES_DONE' },
                            { removeItem: 'ITEM_MITTENS' }, { checkpoint: true }, { goto: { level: 'L06' } },
                        ],
                    }],
                },
            ],
        },
    },
};
