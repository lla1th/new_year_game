import type { LevelScript } from '../script/types';

/** L03 «Часовая башня» (LEVEL_DESIGN.md L03, TASK-006/007; PUZZLE_SPECIFICATIONS.md P-03). Three screens. */
export const L03: LevelScript = {
    levelId: 'L03',
    firstScreen: 'square',
    goals: [
        { flag: 'L03_OWL_AWAKE', hintKeys: ['hint.l03.owl.1', 'hint.l03.owl.2', 'hint.l03.owl.3'] },
        { flag: 'L03_BELLS_DONE', hintKeys: ['hint.P-03.1', 'hint.P-03.2', 'hint.P-03.3'] },
    ],
    screens: {
        square: {
            map: 'assets/maps/L03_square.json',
            // An unused mandarin does not travel further than L02 (TASK-OPT-01).
            onEnter: [{ removeItem: 'ITEM_MANDARIN' }],
            hotspots: [
                {
                    hotspot: 'tower_door',
                    when: 'L03_DOOR_OPEN',
                    onInspect: [{ say: 'ksyusha', key: 'l03.tower_door.open.inspect' }],
                    onUse: [{ goto: { level: 'L03', screen: 'floor1' } }],
                },
                {
                    hotspot: 'tower_door',
                    onUse: [{ sfx: 'sfx_door_creak' }, { setFlag: 'L03_DOOR_OPEN' }, { say: 'ksyusha', key: 'l03.tower_door.open' }],
                },
            ],
        },
        floor1: {
            map: 'assets/maps/L03_floor1.json',
            hotspots: [
                {
                    hotspot: 'owl',
                    when: 'L03_OWL_AWAKE',
                    onInspect: [{ say: 'ksyusha', key: 'l03.owl.awake.inspect' }],
                    onUse: [{ say: 'owl', key: 'l03.owl.after' }],
                },
                {
                    hotspot: 'owl',
                    onUse: [{ say: 'owl', key: 'l03.owl.talk' }],
                    onItem: {
                        ITEM_COCOA: [
                            { removeItem: 'ITEM_COCOA' }, { say: 'owl', key: 'l03.owl.awake' },
                            { anim: 'owl_move' }, { setFlag: 'L03_OWL_AWAKE' },
                        ],
                    },
                },
                // The fresco close-up is the inspect action as well (it sets L03_FRESCO_SEEN when opened).
                { hotspot: 'fresco', onInspect: [{ openPuzzle: 'fresco' }], onUse: [{ openPuzzle: 'fresco' }] },
                { hotspot: 'stairs_up', when: 'L03_OWL_AWAKE', onInspect: [{ say: 'ksyusha', key: 'l03.stairs_up.inspect' }], onUse: [{ goto: { level: 'L03', screen: 'top' } }] },
                { hotspot: 'stairs_up', onInspect: [{ say: 'ksyusha', key: 'l03.stairs.blocked' }] },
            ],
        },
        top: {
            map: 'assets/maps/L03_top.json',
            // "Continue" after the checkpoint on top goes straight on to L04.
            onEnter: [{ ifFlag: 'L03_BELLS_DONE', then: [{ goto: { level: 'L04' } }] }],
            hotspots: [
                {
                    hotspot: 'bells',
                    onUse: [{
                        openPuzzle: 'P-03',
                        onSolved: [
                            { givePart: 'PART_SPRING' }, { setFlag: 'L03_BELLS_DONE' }, { checkpoint: true },
                            { cutscene: 'world1_2' }, { goto: { level: 'L04' } },
                        ],
                    }],
                },
                { hotspot: 'stairs_down', onInspect: [{ say: 'ksyusha', key: 'l03.stairs_down.inspect' }], onUse: [{ goto: { level: 'L03', screen: 'floor1' } }] },
            ],
        },
    },
};
