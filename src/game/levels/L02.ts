import type { LevelScript } from '../script/types';

/** L02 «Ярмарка» (LEVEL_DESIGN.md L02, TASK-003…005, TASK-OPT-01; PUZZLE_SPECIFICATIONS.md P-02). */
export const L02: LevelScript = {
    levelId: 'L02',
    firstScreen: 'fair',
    goals: [
        { flag: 'L02_GARLAND_DONE', hintKeys: ['hint.P-02.1', 'hint.P-02.2', 'hint.P-02.3'] },   // step 2 adapts (L02.visual)
        { flag: 'L02_GATE_OPEN', hintKeys: ['hint.l02.gate', 'hint.l02.gate', 'hint.l02.gate'] },
    ],
    screens: {
        fair: {
            map: 'assets/maps/L02.json',
            // The tease is not replayed when "Continue" brings the player back after the garland.
            onEnter: [{ ifFlag: 'L02_GARLAND_DONE', then: [], else: [{ cutscene: 'l02_tease' }] }],
            hotspots: [
                // Green bulb: once (the flag keeps the source "done" even when the bulb is in the garland).
                { hotspot: 'stall_left', when: 'L02_BULB_GREEN_TAKEN', onInspect: [{ say: 'ksyusha', key: 'l02.stall_left.empty' }] },
                {
                    hotspot: 'stall_left',
                    onUse: [{ giveItem: 'ITEM_BULB_GREEN' }, { setFlag: 'L02_BULB_GREEN_TAKEN' }, { say: 'ksyusha', key: 'l02.stall_left.take' }],
                },
                // Snowman: gold bulb nose; optional mandarin.
                { hotspot: 'snowman', when: 'L02_SNOWMAN_HAPPY', onInspect: [{ say: 'ksyusha', key: 'l02.snowman.happy.inspect' }] },
                {
                    hotspot: 'snowman',
                    when: 'L02_SNOWMAN_SAD',
                    onInspect: [{ say: 'ksyusha', key: 'l02.snowman.sad.inspect' }],
                    onItem: {
                        ITEM_MANDARIN: [
                            { removeItem: 'ITEM_MANDARIN' }, { setFlag: 'L02_SNOWMAN_HAPPY' },
                            { sfx: 'sfx_sparkle' }, { say: 'ksyusha', key: 'l02.snowman.happy' },
                        ],
                    },
                },
                {
                    hotspot: 'snowman',
                    onUse: [{ giveItem: 'ITEM_BULB_GOLD' }, { setFlag: 'L02_SNOWMAN_SAD' }, { say: 'ksyusha', key: 'l02.snowman.take' }],
                },
                // Carousel → blue bulb rolls out.
                { hotspot: 'carousel', when: 'L02_CAROUSEL_SPUN', onInspect: [{ say: 'ksyusha', key: 'l02.carousel.spun.inspect' }] },
                { hotspot: 'carousel', onUse: [{ anim: 'carousel_spin' }, { setFlag: 'L02_CAROUSEL_SPUN' }, { say: 'ksyusha', key: 'l02.carousel.spin' }] },
                // Hidden on the map once taken; the variant guards against a second take anyway.
                { hotspot: 'bulb_blue', when: 'L02_BULB_BLUE_TAKEN', onInspect: [{ say: 'ksyusha', key: 'l02.carousel.spun.inspect' }] },
                {
                    hotspot: 'bulb_blue',
                    onInspect: [{ say: 'ksyusha', key: 'l02.bulb_blue.inspect' }],
                    onUse: [{ giveItem: 'ITEM_BULB_BLUE' }, { setFlag: 'L02_BULB_BLUE_TAKEN' }, { say: 'ksyusha', key: 'l02.bulb_blue.take' }],
                },
                // Garland: P-02 → Nika thaws → dialog → key and cocoa.
                { hotspot: 'garland', when: 'L02_GARLAND_DONE', onInspect: [{ say: 'ksyusha', key: 'l02.garland.done.inspect' }] },
                {
                    hotspot: 'garland',
                    onUse: [{
                        openPuzzle: 'P-02',
                        onSolved: [
                            { anim: 'nika_thaw' }, { dialog: 'l02_nika' },
                            { giveItem: 'ITEM_GATE_KEY' }, { giveItem: 'ITEM_COCOA' },
                            { setFlag: 'L02_GARLAND_DONE' }, { checkpoint: true },
                        ],
                    }],
                },
                {
                    hotspot: 'nika_frozen',
                    when: 'L02_GARLAND_DONE',
                    onInspect: [{ say: 'ksyusha', key: 'l02.nika.thawed.inspect' }],
                    onUse: [{ say: 'nika', key: 'l02.nika.after' }],
                },
                // Gate: key → open → exit.
                {
                    hotspot: 'gate',
                    when: 'L02_GATE_OPEN',
                    onInspect: [{ say: 'ksyusha', key: 'l02.gate.open.inspect' }],
                    onUse: [{ goto: { level: 'L03' } }],
                },
                {
                    hotspot: 'gate',
                    onItem: {
                        ITEM_GATE_KEY: [
                            { removeItem: 'ITEM_GATE_KEY' }, { sfx: 'sfx_gate_creak' },
                            { setFlag: 'L02_GATE_OPEN' }, { say: 'ksyusha', key: 'l02.gate.open' },
                        ],
                    },
                },
            ],
        },
    },
};
