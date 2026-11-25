import type { HotspotScript, LevelScript, Step } from '../script/types';

/** Ёлка и террариум: первый осмотр — обычный текст, повторный — намёк (SCRIPT §4.1). */
const repeated = (flag: 'L01_TREE_SEEN' | 'L01_TERRARIUM_SEEN', first: string, again: string): Step[] => [
    { ifFlag: flag, then: [{ say: 'ksyusha', key: again }], else: [{ say: 'ksyusha', key: first }, { setFlag: flag }] },
];

/** Реплика-шутка помощника: осмотр и «поговорить» — одно и то же. */
const talker = (hotspot: string, speaker: 'tik' | 'tak' | 'pendulum'): HotspotScript => {
    const say: Step[] = [{ say: speaker, key: `l01b.${hotspot}.talk` }];
    return { hotspot, onInspect: say, onUse: say };
};

const inspectOnly = (hotspot: string): HotspotScript => ({ hotspot, onInspect: [{ say: 'ksyusha', key: `l01b.${hotspot}.inspect` }] });

/**
 * L01 «31 декабря, 23:59» — пролог (SCRIPT §4): квартира (P-01, знакомство, выбор имени шпица)
 * и Мастерская Улитки (брифинг). В L02 ведёт только дверь мастерской.
 */
export const L01: LevelScript = {
    levelId: 'L01',
    firstScreen: 'apartment',
    goals: [
        { flag: 'L01_SPITZ_FREED', hintKeys: ['hint.P-01.1', 'hint.P-01.2', 'hint.P-01.3'] },
        { flag: 'L01_PORTAL_ENTERED', hintKeys: ['hint.l01.portal', 'hint.l01.portal', 'hint.l01.portal'] },
        { flag: 'L01_BRIEFING_DONE', hintKeys: ['hint.l01b.1', 'hint.l01b.2', 'hint.l01b.3'] },
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
                            { say: 'spitz', key: 'l01.sofa.sausage', mood: 'happy' },
                            { anim: 'spitz_out' },
                            { setFlag: 'L01_SPITZ_FREED' },
                            // «Знакомство»: имя выбирается посреди диалога; дальше — «почему ко мне», Улитка, просьба о помощи.
                            { dialog: 'l01_intro_a' },
                            { chooseName: true },
                            { ifSpitzName: 1, then: [{ say: 'spitz', key: 'l01.name.opt1.reaction' }] },
                            { ifSpitzName: 2, then: [{ say: 'spitz', key: 'l01.name.opt2.reaction' }] },
                            { dialog: 'l01_intro_b' },
                            { setFlag: 'L01_PORTAL_OPEN' },
                            { checkpoint: true },   // P-01 solved (autosave after every puzzle)
                        ],
                    },
                },
                { hotspot: 'sofa', onInspect: [{ say: 'ksyusha', key: 'l01.sofa.freed.inspect' }] },
                // The tree: the second click hints at Sveta.
                { hotspot: 'tree', onInspect: repeated('L01_TREE_SEEN', 'l01.tree.inspect', 'l01.tree.garland') },
                // Mandarin: once (the source is "done" while the mandarin is in the inventory).
                { hotspot: 'table', onUse: [{ giveItem: 'ITEM_MANDARIN' }, { say: 'ksyusha', key: 'l01.table.take' }] },
                { hotspot: 'fridge', onUse: [{ sfx: 'sfx_fridge' }, { openPuzzle: 'fridge' }] },
                // Portal: only after the dialog; it leads to the workshop, not yet to L02.
                {
                    hotspot: 'terrarium',
                    when: 'L01_PORTAL_OPEN',
                    onInspect: [{ say: 'ksyusha', key: 'l01.terrarium.portal.inspect' }],
                    onUse: [{ setFlag: 'L01_PORTAL_ENTERED' }, { anim: 'portal' }, { goto: { level: 'L01', screen: 'workshop' } }],
                },
                // Before the dialog the second click gives the hint that it ticks.
                { hotspot: 'terrarium', onInspect: repeated('L01_TERRARIUM_SEEN', 'l01.terrarium.inspect', 'l01.terrarium.tick') },
            ],
        },
        workshop: {
            map: 'assets/maps/L01_workshop.json',
            hotspots: [
                // Briefing: obligatory, runs once.
                {
                    hotspot: 'snail',
                    unless: 'L01_BRIEFING_DONE',
                    onInspect: [{ say: 'ksyusha', key: 'l01b.snail.inspect' }],
                    onUse: [{ dialog: 'l01b_brief' }, { setFlag: 'L01_BRIEFING_DONE' }, { checkpoint: true }],
                },
                {
                    hotspot: 'snail',
                    onInspect: [{ say: 'ksyusha', key: 'l01b.snail.inspect' }],
                    onUse: [{ say: 'snail', key: 'l01b.dlg.16' }],
                },
                talker('tik', 'tik'),
                talker('tak', 'tak'),
                talker('pendulum', 'pendulum'),
                inspectOnly('board'),
                inspectOnly('bench'),
                inspectOnly('clock'),
                // The door works only after the briefing.
                {
                    hotspot: 'door',
                    when: 'L01_BRIEFING_DONE',
                    onInspect: [{ say: 'ksyusha', key: 'l01b.door.inspect' }],
                    onUse: [{ goto: { level: 'L02' } }],
                },
                { hotspot: 'door', onInspect: [{ say: 'ksyusha', key: 'l01b.door.inspect' }] },
            ],
        },
    },
};
