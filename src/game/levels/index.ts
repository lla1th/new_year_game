import type { LevelId } from '../data/types';
import type { LevelScript } from '../script/types';
import { L01 } from './L01';
import { L02 } from './L02';
import { L03 } from './L03';
import { L04 } from './L04';
import { L05 } from './L05';
import { L06 } from './L06';

/** Placeholder for levels that are not built yet: a room with a "to be continued" sign. */
function toBeContinued(levelId: LevelId): LevelScript {
    return {
        levelId,
        firstScreen: 'tbc',
        goals: [],
        screens: {
            tbc: {
                map: 'assets/maps/TBC.json',
                onEnter: [{ say: 'ksyusha', key: 'l02.tbc' }],
                hotspots: [{ hotspot: 'sign', onInspect: [{ say: 'ksyusha', key: 'l02.tbc.inspect' }] }],
            },
        },
    };
}

/** Screen to start a level on from a save: an unknown (old or tampered) screen id falls back to the first screen. */
export function startScreen(level: LevelId, screenId: string | null): string | undefined {
    return screenId !== null && screenId in LEVELS[level].screens ? screenId : undefined;
}

export const LEVELS: Record<LevelId, LevelScript> = {
    L01,
    L02,
    L03,
    L04,
    L05,
    L06,
    L07: toBeContinued('L07'),
    L08: toBeContinued('L08'),
};
