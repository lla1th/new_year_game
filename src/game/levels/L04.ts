import type { FlagId, PuzzleId, SpeakerId } from '../data/types';
import type { HotspotScript, LevelScript, ScreenScript, SideRoomSpec, SideRoomTarget, Step } from '../script/types';

const say = (speaker: SpeakerId, key: string): Step => ({ say: speaker, key: `l04.quest.${key}` });
const mark = (flag: FlagId): Step[] => [{ setFlag: flag }, { checkpoint: true }];
const branch = (flag: FlagId, then: Step[], otherwise: Step[] = []): Step => ({ ifFlag: flag, then, else: otherwise });

function supply(id: string, at: number, label: string, icon: string, flag: FlagId, puzzle?: PuzzleId, needs?: FlagId): [SideRoomTarget, HotspotScript] {
    const taken = [...mark(flag), say('ksyusha', id)];
    const use: Step[] = puzzle ? [{ openPuzzle: puzzle, onSolved: taken }] : taken;
    return [
        { id, at, label, icon, kind: 'supply', unless: flag },
        { hotspot: id, unless: flag, onUse: needs ? [branch(needs, use, [say('ksyusha', `${id}_clue`)])] : use },
    ];
}

function evidence(id: string, at: number, label: string, icon: string, flag: FlagId, when?: FlagId): [SideRoomTarget, HotspotScript] {
    const line = say('ksyusha', id);
    return [
        { id, at, label, icon, kind: 'clue', when },
        { hotspot: id, when, onUse: [branch(flag, [], mark(flag)), line] },
    ];
}

const [order, orderScript] = evidence('order', 0.38, 'Карточка заказа', '▤', 'L04_ORDER_CLUE');
const [legend, legendScript] = evidence('legend', 0.68, 'Памятка стажёру', '!', 'L04_LOCKER_CLUE');
const [mold, moldScript] = supply('mold', 0.24, 'Стеллаж с формами', '▱', 'L04_CAKE_MOLD', 'l04-mold', 'L04_ORDER_CLUE');
const [bag, bagScript] = supply('bag', 0.83, 'Шкафчик глазури', '◈', 'L04_GLAZE_BAG', 'l04-locker', 'L04_LOCKER_CLUE');
const [fuse, fuseScript] = supply('fuse', 0.29, 'Коробка предохранителей', 'ϟ', 'L04_SORT_FUSE', 'l04-fuse', 'L04_KLAVA_NOTE');
const [note, noteScript] = supply('note', 0.79, 'Блокнот Клавы', '✉', 'L04_KLAVA_NOTE');
const [log, logScript] = evidence('log', 0.38, 'Журнал смены', '▤', 'L04_KEY_LOG', 'L04_KLAVA_MET');
const [gasket, gasketScript] = supply('gasket', 0.27, 'Ящик списанных деталей', '◎', 'L04_GASKET', 'l04-gasket');
const [silicone, siliconeScript] = supply('silicone', 0.68, 'Пищевой силикон', '◈', 'L04_GASKET');
const [drive, driveScript] = evidence('drive', 0.68, 'Паспорт привода', '▤', 'L04_DRIVE_CLUE');
const [belt, beltScript] = supply('belt', 0.84, 'Полка с ремнями', '∞', 'L04_BELT', 'l04-belt', 'L04_DRIVE_CLUE');

const rooms = {
    factory: {
        title: 'Цех сборки', action: 'Собрать торт', objective: 'Выполните три заказа', width: 1.6, theme: 'cakes',
        flag: 'L04_CAKES_DONE', puzzle: 'l04-cakes',
        targets: [{ id: 'ginger', at: 0.50, label: 'Пряник', icon: '', kind: 'worker' }, mold, bag, order, legend, log],
        tasks: [['L04_GINGER_MET', 'Поговорите с Пряником'], ['L04_CAKE_MOLD', 'Подберите форму по карте заказа'], ['L04_GLAZE_BAG', 'Найдите мешок глазури']],
    },
    sorting: {
        title: 'Цех сортировки', action: 'Сортировать конфеты', objective: 'Отсортируйте конфеты', width: 1.8, theme: 'candy',
        flag: 'L04_SORT_DONE', left: 'factory', puzzle: 'l04-candy',
        targets: [{ id: 'klava', at: 0.50, label: 'Клава', icon: '', kind: 'worker' }, fuse, note, { ...silicone, when: 'L04_LEKHA_MET' }],
        tasks: [
            ['L04_KLAVA_MET', 'Поговорите с Клавой'], ['L04_KLAVA_NOTE', 'Найдите записку Клавы'],
            ['L04_SORT_KEY', '← Покажите записку Прянику'], ['L04_RECONCILED', 'Отнесите ключ и ответ Клаве'],
            ['L04_SORT_FUSE', 'Подберите предохранитель по схеме'],
        ],
    },
    technical: {
        title: 'Технический отсек', action: 'Соединить трубы', objective: 'Запустите конвейер', width: 1.5, theme: 'glaze',
        flag: 'L04_PIPES_DONE', left: 'sorting', puzzle: 'P-04',
        targets: [{ id: 'lekha', at: 0.49, label: 'Леха', icon: '', kind: 'worker' }, gasket, belt, drive],
        tasks: [['L04_LEKHA_MET', 'Поговорите с Лехой'], ['L04_GASKET', 'Найдите прокладку'], ['L04_BELT', 'Подберите ремень по замерам']],
    },
} satisfies Record<string, SideRoomSpec>;

const ginger: HotspotScript = { hotspot: 'ginger', onUse: [
    branch('L04_CAKES_DONE', [
        branch('L04_KLAVA_MET', [
            branch('L04_RECONCILED', [say('ginger', 'ginger_friends')], [
                branch('L04_SORT_KEY', [say('ginger', 'ginger_wait')],
                    [branch('L04_KLAVA_NOTE', [
                        branch('L04_KEY_LOG', [{ openPuzzle: 'l04-key-story', onSolved: [...mark('L04_SORT_KEY'), say('ginger', 'ginger_key')] }],
                            [say('ginger', 'ginger_log')]),
                    ], [say('ginger', 'ginger_note')])]),
            ]),
        ], [say('ginger', 'ginger_done')]),
    ], [
        branch('L04_GINGER_MET', [say('ginger', 'ginger_reminder')], [...mark('L04_GINGER_MET'), say('ginger', 'ginger_request')]),
    ]),
] };

const klava: HotspotScript = { hotspot: 'klava', onUse: [
    branch('L04_RECONCILED', [say('klava', 'klava_friends')], [
        branch('L04_KLAVA_MET', [
            branch('L04_SORT_KEY', [...mark('L04_RECONCILED'), say('ksyusha', 'return_key'), say('klava', 'klava_accept')],
                [say('klava', 'klava_reminder')]),
        ], [...mark('L04_KLAVA_MET'), say('klava', 'klava_request')]),
    ]),
] };

const lekha: HotspotScript = { hotspot: 'lekha', onUse: [
    branch('L04_PIPES_DONE', [say('lekha', 'lekha_done')], [
        branch('L04_LEKHA_MET', [say('lekha', 'lekha_reminder')], [...mark('L04_LEKHA_MET'), say('lekha', 'lekha_request')]),
    ]),
] };

function room(sideRoom: SideRoomSpec, tasks: HotspotScript[], next: Step[], thanks: Step, reward: Step[] = []): ScreenScript {
    const puzzle: Step[] = [{ openPuzzle: sideRoom.puzzle, onSolved: [
        { setFlag: sideRoom.flag }, ...reward, { sfx: 'sfx_factory_door' }, { checkpoint: true }, thanks,
    ] }];
    const gated = sideRoom.tasks.reduceRight<Step[]>((ready, [flag]) =>
        [branch(flag, ready, [say('ksyusha', `need_${flag.toLowerCase().slice(4)}`)])], puzzle);
    return {
        map: 'assets/maps/L04.json',
        sideRoom,
        hotspots: [
            ...tasks,
            { hotspot: 'panel', unless: sideRoom.flag, onUse: gated },
            { hotspot: 'right', when: sideRoom.flag, onUse: next },
            ...(sideRoom.left ? [{ hotspot: 'left', onUse: [{ goto: { level: 'L04', screen: sideRoom.left } } as const] }] : []),
        ],
    };
}

export const L04: LevelScript = {
    levelId: 'L04',
    firstScreen: 'factory',
    goals: [],
    screens: {
        factory: room(rooms.factory, [ginger, moldScript, bagScript, orderScript, legendScript, logScript], [{ goto: { level: 'L04', screen: 'sorting' } }], say('ginger', 'ginger_done')),
        sorting: room(rooms.sorting, [klava, fuseScript, noteScript, { ...siliconeScript, when: 'L04_LEKHA_MET' }], [{ goto: { level: 'L04', screen: 'technical' } }], say('klava', 'klava_done')),
        technical: room(rooms.technical, [lekha, gasketScript, beltScript, driveScript], [
            { removeItem: 'ITEM_VALVE' }, { removeItem: 'ITEM_CANDY_CANE' },
            { ifItem: 'ITEM_MITTENS', then: [], else: [{ giveItem: 'ITEM_MITTENS' }] }, { goto: { level: 'L05' } },
        ], say('lekha', 'lekha_done'), [{ sfx: 'sfx_glaze_flow' }, { giveItem: 'ITEM_MITTENS' }]),
    },
};

/** Legacy completed saves start by the unlocked exit. */
export function l04SaveScreen(screen: string | undefined, hasFlag: (flag: FlagId) => boolean): string {
    if ((!screen || screen === 'factory') && hasFlag('L04_PIPES_DONE') && !hasFlag('L04_CAKES_DONE')) return 'technical';
    if (!screen || !Object.prototype.hasOwnProperty.call(rooms, screen)) return 'factory';
    return screen;
}
