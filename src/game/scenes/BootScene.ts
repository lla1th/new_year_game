import { Scene } from 'phaser';
import type { LevelScript } from '../script/types';

/** Temporary start-up until the main menu (Task 9): the M0 test map as a one-screen level. */
const TEST_LEVEL: LevelScript = {
    levelId: 'L01',
    firstScreen: 'main',
    goals: [],
    screens: { main: { map: 'assets/maps/test.json', hotspots: [] } },
};

export class BootScene extends Scene
{
    constructor ()
    {
        super('BootScene');
    }

    create ()
    {
        this.scene.start('LevelScene', { script: TEST_LEVEL });
    }
}
