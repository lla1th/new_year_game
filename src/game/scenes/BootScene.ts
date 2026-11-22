import { Scene } from 'phaser';
import { LEVELS } from '../levels';

/** Temporary start-up until the main menu (Task 9): starts L01. */
export class BootScene extends Scene
{
    constructor ()
    {
        super('BootScene');
    }

    create ()
    {
        this.scene.start('LevelScene', { script: LEVELS.L01 });
    }
}
