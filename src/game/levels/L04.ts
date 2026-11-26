import type { FlagId } from '../data/types';
import type { LevelScript, ScreenScript, SideRoomSpec, Step } from '../script/types';

const rooms = {
    factory: { title: 'Цех сборки', action: 'Собрать торт', objective: 'Выполните три заказа', width: 1.6, theme: 'cakes', flag: 'L04_CAKES_DONE', puzzle: 'l04-cakes' },
    sorting: { title: 'Цех сортировки', action: 'Сортировать конфеты', objective: 'Отсортируйте конфеты', width: 1.8, theme: 'candy', flag: 'L04_SORT_DONE', left: 'factory', puzzle: 'l04-candy' },
    technical: { title: 'Технический отсек', action: 'Соединить трубы', objective: 'Запустите глазирование', width: 1.5, theme: 'glaze', flag: 'L04_PIPES_DONE', left: 'sorting', puzzle: 'P-04' },
} satisfies Record<string, SideRoomSpec>;

function room(sideRoom: SideRoomSpec, next: Step[], reward: Step[] = []): ScreenScript {
    return {
        map: 'assets/maps/L04.json',
        sideRoom,
        hotspots: [
            { hotspot: 'panel', unless: sideRoom.flag, onUse: [{ openPuzzle: sideRoom.puzzle, onSolved: [
                { setFlag: sideRoom.flag }, ...reward, { sfx: 'sfx_factory_door' }, { checkpoint: true },
            ] }] },
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
        factory: room(rooms.factory, [{ goto: { level: 'L04', screen: 'sorting' } }]),
        sorting: room(rooms.sorting, [{ goto: { level: 'L04', screen: 'technical' } }]),
        technical: room(rooms.technical, [
            // Legacy completed checkpoints may also arrive here without the original reward.
            { removeItem: 'ITEM_VALVE' }, { removeItem: 'ITEM_CANDY_CANE' },
            { ifItem: 'ITEM_MITTENS', then: [], else: [{ giveItem: 'ITEM_MITTENS' }] }, { goto: { level: 'L05' } },
        ], [{ sfx: 'sfx_glaze_flow' }, { giveItem: 'ITEM_MITTENS' }]),
    },
};

/** The previous build saved one screen named factory; keep completed saves at the unlocked exit. */
export function l04SaveScreen(screen: string | undefined, hasFlag: (flag: FlagId) => boolean): string {
    if ((!screen || screen === 'factory') && hasFlag('L04_PIPES_DONE') && !hasFlag('L04_CAKES_DONE')) return 'technical';
    if (!screen || !(screen in rooms)) return 'factory';
    return screen;
}
