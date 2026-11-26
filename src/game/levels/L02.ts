import type { HotspotScript, LevelScript, Step } from '../script/types';

const say = (key: string): Step => ({ say: 'ksyusha', key });
const inspect = (hotspot: string, key = `l02.${hotspot}.inspect`): HotspotScript => ({ hotspot, onInspect: [say(key)] });
const unlockGate: Step[] = [
    { removeItem: 'ITEM_GATE_KEY' }, { sfx: 'sfx_gate' },
    { setFlag: 'L02_GATE_OPEN' }, say('l02.gate.open'),
];
const enterFair: HotspotScript = {
    hotspot: 'gate',
    when: 'L02_GATE_OPEN',
    onInspect: [say('l02.gate.open.inspect')],
    onUse: [{ goto: { level: 'L02', screen: 'entrance' } }],
};

/** A way out to another screen of the level: inspect says a short line, use goes there. */
const exit = (hotspot: string, screen: string): HotspotScript => ({
    hotspot, onInspect: [say('l02.exit.inspect')], onUse: [{ goto: { level: 'L02', screen } }],
});

/**
 * L02 «Ярмарка» (SCRIPT §5): five screens. The gate (S-02a) → the tent and the cat → the shed key →
 * the generator (P-02: three bulbs, the pump, the fuel, the cord) → the fair comes alive → the shooting gallery (S-02b) → Nika.
 */
export const L02: LevelScript = {
    levelId: 'L02',
    firstScreen: 'gate',
    goals: [
        { flag: 'L02_GATE_OPEN', hintKeys: ['hint.S-02a.1', 'hint.S-02a.2', 'hint.S-02a.3'] },
        { flag: 'L02_CAT_SCENE_DONE', hintKeys: ['hint.l02.tent', 'hint.l02.tent', 'hint.l02.tent'] },
        { flag: 'L02_SHED_KEY_TAKEN', hintKeys: ['hint.l02.key', 'hint.l02.key', 'hint.l02.key'] },
        { flag: 'L02_SHED_OPEN', hintKeys: ['hint.l02.shed', 'hint.l02.shed', 'hint.l02.shed'] },
        { flag: 'L02_GENERATOR_ON', hintKeys: ['hint.P-02.1', 'hint.P-02.2', 'hint.P-02.3'] },
        { flag: 'L02_FINISHED', hintKeys: ['hint.l02.nika', 'hint.l02.nika', 'hint.l02.nika'] },
    ],
    screens: {
        // 1. Before the gate: S-02a «Ключ у обезьянки» (variant A: shiny foil for the key).
        gate: {
            map: 'assets/maps/L02_gate.json',
            onEnter: [{ ifFlag: 'L02_GATE_OPEN', then: [], else: [{ dialog: 'l02_arrive' }] }],
            hotspots: [
                enterFair,
                {
                    hotspot: 'gate',
                    onItem: { ITEM_GATE_KEY: unlockGate },
                },
                { ...enterFair, hotspot: 'chain' },
                {
                    ...inspect('chain', 'l02.chain.cut'),
                    onItem: { ITEM_GATE_KEY: unlockGate },
                },
                {
                    hotspot: 'pole',
                    onInspect: [say('l02.pole.inspect')],
                    onUse: [{ ifFlag: 'L02_GATE_OPEN', then: [{ say: 'monkey', key: 'l02.monkey.hint' }], else: [{ say: 'monkey', key: 'l02.monkey.talk' }] }],
                    onItem: { ITEM_MANDARIN: [{ say: 'monkey', key: 'l02.monkey.refuse' }] },
                },
                {
                    hotspot: 'crate',
                    onInspect: [say('l02.crate.inspect')],
                    onItem: {
                        ITEM_FOIL: [
                            { removeItem: 'ITEM_FOIL' }, { anim: 'monkey_swap' }, { giveItem: 'ITEM_GATE_KEY' }, say('l02.monkey.swap'),
                        ],
                    },
                },
                // The foil: once (the flag keeps the urn «done» after the foil is spent).
                { hotspot: 'urn', when: 'L02_FOIL_TAKEN', onInspect: [say('l02.urn.inspect')] },
                {
                    hotspot: 'urn',
                    onInspect: [say('l02.urn.inspect')],
                    onUse: [{ giveItem: 'ITEM_FOIL' }, { setFlag: 'L02_FOIL_TAKEN' }, say('l02.urn.take')],
                },
            ],
        },
        // 2. Entrance: the frozen vendor (later the owner of the gallery), the lantern bulb, the key booth.
        entrance: {
            map: 'assets/maps/L02_entrance.json',
            hotspots: [
                {
                    hotspot: 'vendor',
                    when: 'L02_FAIR_ALIVE',
                    onInspect: [{ say: 'vendor', key: 'l02.vendor.board', mood: 'smug' }],
                    onUse: [
                        { ifFlag: 'L02_VENDOR_MET', then: [], else: [
                            { dialog: 'l02_vendor' }, { say: 'spitz', key: 'l02.spitz.crossout' }, { setFlag: 'L02_VENDOR_MET' },
                        ] },
                        { openPuzzle: 'S-02b', onSolved: [{ setFlag: 'L02_GALLERY_WON' }, { checkpoint: true }] },
                    ],
                },
                {
                    hotspot: 'vendor',
                    onInspect: [say('l02.vendor.inspect')],
                    onUse: [{
                        ifFlag: 'L02_BULB_RED_TAKEN',
                        then: [{ say: 'spitz', key: 'l02.vendor.silent.2' }],
                        else: [say('l02.vendor.silent.1')],
                    }],
                },
                { hotspot: 'lantern', when: 'L02_BULB_RED_TAKEN', onInspect: [say('l02.vendor.inspect')] },
                {
                    hotspot: 'lantern',
                    onInspect: [say('l02.lantern.inspect')],
                    onUse: [{ giveItem: 'ITEM_BULB_RED' }, { setFlag: 'L02_BULB_RED_TAKEN' }, say('l02.lantern.take')],
                },
                { hotspot: 'booth', when: 'L02_SHED_KEY_TAKEN', onInspect: [say('l02.booth.empty')] },
                {
                    hotspot: 'booth',
                    when: 'L02_CAT_SCENE_DONE',
                    onInspect: [say('l02.booth.inspect')],
                    onUse: [{ giveItem: 'ITEM_SHED_KEY' }, { setFlag: 'L02_SHED_KEY_TAKEN' }, say('l02.key.take')],
                },
                inspect('booth'),
                { hotspot: 'frozen_walkers', onInspect: [say('l02.frozen.inspect')] },
                { hotspot: 'walkers', onInspect: [say('l02.walkers.inspect')] },
                exit('exit_gate', 'gate'),
                exit('exit_right', 'square'),
            ],
        },
        // 3. The square: the tent, the snowman (yellow bulb), the carousel (blue bulb), the snowdrift (pump), the shed.
        square: {
            map: 'assets/maps/L02_square.json',
            hotspots: [
                { hotspot: 'tent', onInspect: [say('l02.tent.inspect')], onUse: [{ goto: { level: 'L02', screen: 'tent' } }] },
                { hotspot: 'snowman', when: 'L02_SNOWMAN_HAPPY', onInspect: [say('l02.snowman.happy.inspect')] },
                {
                    hotspot: 'snowman',
                    when: 'L02_SNOWMAN_SAD',
                    onInspect: [say('l02.snowman.sad.inspect')],
                    onItem: {
                        ITEM_MANDARIN: [
                            { removeItem: 'ITEM_MANDARIN' }, { setFlag: 'L02_SNOWMAN_HAPPY' },
                            { sfx: 'sfx_hihik' }, say('l02.snowman.happy'),
                        ],
                    },
                },
                {
                    hotspot: 'snowman',
                    onInspect: [say('l02.snowman.inspect'), { say: 'snowman', key: 'l02.snowman.hint' }],
                    onUse: [{ giveItem: 'ITEM_BULB_YELLOW' }, { setFlag: 'L02_SNOWMAN_SAD' }, say('l02.snowman.take')],
                },
                { hotspot: 'carousel', when: 'L02_CAROUSEL_SPUN', onInspect: [say('l02.carousel.spun.inspect')] },
                {
                    hotspot: 'carousel',
                    onInspect: [say('l02.carousel.inspect')],
                    onUse: [{ anim: 'carousel_spin' }, { setFlag: 'L02_CAROUSEL_SPUN' }, say('l02.carousel.spin')],
                },
                {
                    hotspot: 'bulb_blue',
                    onInspect: [say('l02.bulb_blue.inspect')],
                    onUse: [{ giveItem: 'ITEM_BULB_BLUE' }, { setFlag: 'L02_BULB_BLUE_TAKEN' }, say('l02.bulb_blue.take')],
                },
                { hotspot: 'snowdrift', when: 'L02_PUMP_TAKEN', onInspect: [say('l02.snowdrift.inspect')] },
                {
                    hotspot: 'snowdrift',
                    onInspect: [say('l02.snowdrift.inspect')],
                    onUse: [{ giveItem: 'ITEM_PUMP' }, { setFlag: 'L02_PUMP_TAKEN' }, say('l02.pump.take')],
                },
                inspect('radio'),
                {
                    hotspot: 'shed_door',
                    when: 'L02_SHED_OPEN',
                    onInspect: [say('l02.shed.open')],
                    onUse: [{ goto: { level: 'L02', screen: 'shed' } }],
                },
                {
                    hotspot: 'shed_door',
                    onInspect: [say('l02.shed.locked')],
                    onItem: {
                        ITEM_SHED_KEY: [
                            { removeItem: 'ITEM_SHED_KEY' }, { sfx: 'sfx_door_creak' }, { setFlag: 'L02_SHED_OPEN' }, say('l02.shed.open'),
                        ],
                    },
                },
                exit('exit_left', 'entrance'),
            ],
        },
        // 4. The shed: P-02 «Генератор» and the fuel barrel.
        shed: {
            map: 'assets/maps/L02_shed.json',
            hotspots: [
                {
                    hotspot: 'generator',
                    onInspect: [say('l02.generator.inspect')],
                    onUse: [{
                        openPuzzle: 'P-02',
                        onSolved: [
                            { setFlag: 'L02_GENERATOR_ON' }, { dialog: 'l02_generator_on' },
                            { setFlag: 'L02_FAIR_ALIVE' }, { checkpoint: true },
                        ],
                    }],
                },
                {
                    hotspot: 'barrel',
                    when: 'L02_FUELED',
                    onInspect: [say('l02.barrel.inspect')],
                    onItem: { ITEM_PUMP: [say('l02.barrel.full')] },
                },
                {
                    hotspot: 'barrel',
                    when: 'L02_PUMP_FILLED',
                    onInspect: [say('l02.barrel.inspect')],
                    onItem: { ITEM_PUMP: [say('l02.barrel.fill')] },
                },
                {
                    hotspot: 'barrel',
                    onInspect: [say('l02.barrel.inspect')],
                    onItem: { ITEM_PUMP: [{ sfx: 'sfx_glaze_flow' }, { setFlag: 'L02_PUMP_FILLED' }, say('l02.barrel.fill')] },
                },
                exit('exit_shed', 'square'),
            ],
        },
        // 5. Inside the tent: the cat, Nika, the unfinished teleporter.
        tent: {
            map: 'assets/maps/L02_tent.json',
            onEnter: [{
                ifFlag: 'L02_CAT_SCENE_DONE',
                then: [],
                else: [
                    { dialog: 'l02_cat_a' }, { anim: 'cat_jump' }, { dialog: 'l02_cat_b' },
                    { setFlag: 'L02_CAT_SCENE_DONE' }, { say: 'spitz', key: 'l02.cat.scene.hint' }, { checkpoint: true },
                ],
            }],
            hotspots: [
                {
                    hotspot: 'nika',
                    when: 'L02_FINISHED',
                    onInspect: [say('l02.nika.thawed.inspect')],
                    onUse: [{ say: 'nika', key: 'l02.nika.after' }],
                },
                {
                    hotspot: 'nika',
                    when: 'L02_FAIR_ALIVE',
                    onInspect: [say('l02.nika.thawed.inspect')],
                    onUse: [
                        { dialog: 'l02_nika' }, { giveItem: 'ITEM_COCOA' }, { setFlag: 'L02_FINISHED' },
                        { ifFlag: 'L02_GALLERY_WON', then: [], else: [{ say: 'nika', key: 'l02.nika.stroll' }] },
                        { checkpoint: true },
                    ],
                },
                inspect('nika'),
                {
                    hotspot: 'teleporter',
                    when: 'L02_FINISHED',
                    onInspect: [say('l02.teleporter.inspect')],
                    onUse: [say('l02.teleporter.go'), { goto: { level: 'L03' } }],
                },
                inspect('teleporter'),
                exit('exit_tent', 'square'),
            ],
        },
    },
};
