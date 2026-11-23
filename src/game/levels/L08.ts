import type { LevelScript } from '../script/types';

/** L08 «Полночь» — finale (LEVEL_DESIGN.md L08, TASK-014/015; PUZZLE_SPECIFICATIONS.md P-08; STORY.md L08). */
export const L08: LevelScript = {
    levelId: 'L08',
    firstScreen: 'square',
    goals: [
        { flag: 'L08_PARTS_INSERTED', hintKeys: ['hint.l08.clock', 'hint.l08.clock', 'hint.l08.clock'] },
        { flag: 'L08_GIFT_OPENED', hintKeys: ['hint.P-08.1', 'hint.P-08.2', 'hint.P-08.3'] },   // step 3 offers the auto-solve (L08.visual)
    ],
    screens: {
        square: {
            map: 'assets/maps/L08.json',
            onEnter: [{
                ifFlag: 'L08_GIFT_OPENED',
                then: [{ cutscene: 'ending' }, { goto: { level: 'L08', screen: 'post' } }],   // "Continue" after the last checkpoint
                else: [{ ifFlag: 'L08_PARTS_INSERTED', then: [], else: [{ dialog: 'l08_snail' }] }],
            }],
            hotspots: [
                { hotspot: 'clock', when: 'L08_PARTS_INSERTED', onInspect: [{ say: 'ksyusha', key: 'l08.clock.done.inspect' }] },
                {
                    hotspot: 'clock',
                    onUse: [{
                        openPuzzle: 'clock',
                        onSolved: [
                            { removePart: 'PART_SPRING' }, { removePart: 'PART_GEAR' }, { removePart: 'PART_HANDS' },
                            { setFlag: 'L08_PARTS_INSERTED' }, { checkpoint: true }, { cutscene: 'midnight' },
                        ],
                    }],
                },
                { hotspot: 'snail', onUse: [{ say: 'snail', key: 'l08.snail.talk' }] },
                {
                    hotspot: 'gift_box',     // appears after midnight (enabledIf on the map)
                    onUse: [{
                        openPuzzle: 'P-08',
                        onSolved: [
                            { setFlag: 'L08_GIFT_OPENED' }, { setFlag: 'GAME_COMPLETED' }, { checkpoint: true },
                            { cutscene: 'ending' }, { goto: { level: 'L08', screen: 'post' } },
                        ],
                    }],
                },
            ],
        },
        // After the credits: the pixel apartment from the prologue; the spitz and the cat sleep under the tree.
        post: {
            map: 'assets/maps/postcredits.json',
            onEnter: [{ say: 'ksyusha', key: 'l08.post.ksy' }, { cutscene: 'to_menu' }],
            hotspots: [],
        },
    },
};
