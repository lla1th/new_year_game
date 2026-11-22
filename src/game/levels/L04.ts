import type { LevelScript } from '../script/types';

/** L04 «Пряничный цех» (LEVEL_DESIGN.md L04, TASK-008/009; PUZZLE_SPECIFICATIONS.md P-04). */
export const L04: LevelScript = {
    levelId: 'L04',
    firstScreen: 'factory',
    goals: [
        { flag: 'L04_VALVE_TAKEN', hintKeys: ['hint.l04.valve.1', 'hint.l04.valve.2', 'hint.l04.valve.3'] },
        { flag: 'L04_VALVE_INSTALLED', hintKeys: ['hint.l04.install', 'hint.l04.install', 'hint.l04.install'] },
        { flag: 'L04_PIPES_DONE', hintKeys: ['hint.P-04.1', 'hint.P-04.2', 'hint.P-04.3'] },   // step 3 highlights tiles (L04.visual)
    ],
    screens: {
        factory: {
            map: 'assets/maps/L04.json',
            onEnter: [{ ifFlag: 'L04_PIPES_DONE', then: [], else: [{ dialog: 'l04_lekha_intro' }] }],
            hotspots: [
                { hotspot: 'lekha', when: 'L04_PIPES_DONE', onUse: [{ say: 'lekha', key: 'l04.lekha.after' }] },
                { hotspot: 'lekha', onUse: [{ say: 'lekha', key: 'l04.dlg.lekha.2' }] },
                // The cane: once (after the trade the jar is "done" even though the cane is gone).
                { hotspot: 'candy_jar', when: 'L04_VALVE_TAKEN', onInspect: [{ say: 'ksyusha', key: 'l04.candy_jar.empty' }] },
                { hotspot: 'candy_jar', onUse: [{ giveItem: 'ITEM_CANDY_CANE' }, { say: 'ksyusha', key: 'l04.candy_jar.take' }] },
                {
                    hotspot: 'ginger',
                    when: 'L04_VALVE_TAKEN',
                    onInspect: [{ say: 'ksyusha', key: 'l04.ginger.happy.inspect' }],
                    onUse: [{ say: 'ginger', key: 'l04.ginger.beep' }],
                },
                {
                    hotspot: 'ginger',
                    onUse: [{ say: 'ginger', key: 'l04.ginger.talk' }],
                    onItem: {
                        ITEM_CANDY_CANE: [
                            { removeItem: 'ITEM_CANDY_CANE' }, { giveItem: 'ITEM_VALVE' }, { setFlag: 'L04_VALVE_TAKEN' },
                            { say: 'ginger', key: 'l04.ginger.beep' },
                        ],
                    },
                },
                { hotspot: 'tank', when: 'L04_PIPES_DONE', onInspect: [{ say: 'ksyusha', key: 'l04.tank.done.inspect' }] },
                {
                    hotspot: 'tank',
                    when: 'L04_VALVE_INSTALLED',
                    onInspect: [{ say: 'ksyusha', key: 'l04.tank.installed.inspect' }],
                    onUse: [{
                        openPuzzle: 'P-04',
                        onSolved: [
                            { setFlag: 'L04_PIPES_DONE' }, { sfx: 'sfx_glaze_flow' }, { dialog: 'l04_lekha_done' },
                            { giveItem: 'ITEM_MITTENS' }, { checkpoint: true },
                        ],
                    }],
                },
                {
                    hotspot: 'tank',
                    onItem: {
                        ITEM_VALVE: [
                            { removeItem: 'ITEM_VALVE' }, { sfx: 'sfx_pipe_rotate' }, { setFlag: 'L04_VALVE_INSTALLED' },
                            { say: 'ksyusha', key: 'l04.tank.valve' },
                        ],
                    },
                },
                { hotspot: 'conveyor', when: 'L04_PIPES_DONE', onInspect: [{ say: 'ksyusha', key: 'l04.conveyor.done.inspect' }] },
                { hotspot: 'freezer_door', onUse: [{ goto: { level: 'L05' } }] },   // active only after L04_PIPES_DONE (map)
            ],
        },
    },
};
