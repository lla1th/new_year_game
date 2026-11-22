import type { LevelScript } from '../script/types';

/** L03 «Часовая башня» — square screen only so far (completed in M2 Task 6). */
export const L03: LevelScript = {
    levelId: 'L03',
    firstScreen: 'square',
    goals: [],
    screens: {
        square: {
            map: 'assets/maps/TBC.json',
            // An unused mandarin does not travel further than L02 (TASK-OPT-01).
            onEnter: [{ removeItem: 'ITEM_MANDARIN' }],
            hotspots: [],
        },
    },
};
