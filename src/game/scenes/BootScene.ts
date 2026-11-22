import { Scene } from 'phaser';

/** Idle until the main menu starts a level (see controller.startLevel). */
export class BootScene extends Scene
{
    constructor ()
    {
        super('BootScene');
    }
}
