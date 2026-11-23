import type { LevelScript } from '../script/types';

/** L06 «Комикс-крыши» (LEVEL_DESIGN.md L06, TASK-011; PUZZLE_SPECIFICATIONS.md P-06). */
export const L06: LevelScript = {
    levelId: 'L06',
    firstScreen: 'roofs',
    goals: [
        { flag: 'L06_BRIDGE_DONE', hintKeys: ['hint.P-06.1', 'hint.P-06.2', 'hint.P-06.3'] },
    ],
    screens: {
        roofs: {
            map: 'assets/maps/L06.json',
            onEnter: [{ ifFlag: 'L06_BRIDGE_DONE', then: [], else: [{ dialog: 'l06_friends' }] }],
            hotspots: [
                // Talking to the friends repeats their lines plus a nudge.
                { hotspot: 'friends', onUse: [{ dialog: 'l06_friends' }, { say: 'nika', key: 'l06.friends.hint' }] },
                { hotspot: 'comic_page', when: 'L06_BRIDGE_DONE', onInspect: [{ say: 'ksyusha', key: 'l06.comic_page.done.inspect' }] },
                {
                    hotspot: 'comic_page',
                    onUse: [{ openPuzzle: 'P-06', onSolved: [{ sfx: 'sfx_whoosh' }, { setFlag: 'L06_BRIDGE_DONE' }, { checkpoint: true }] }],
                },
                // The bridge is active on the map only after P-06; the variant below guards the script anyway.
                {
                    hotspot: 'bridge',
                    when: 'L06_BRIDGE_DONE',
                    onInspect: [{ say: 'ksyusha', key: 'l06.bridge.inspect' }],
                    onUse: [{ goto: { level: 'L07' } }],
                },
                { hotspot: 'bridge', onInspect: [{ say: 'ksyusha', key: 'l06.gap.inspect' }] },
            ],
        },
    },
};
