import { Scene } from 'phaser';
import { loadLevelAssets } from '../assets/loadLevelAssets';
import { getGameData } from '../data/gameData';

/** Loads the sounds (music for the menu), then idles until the main menu starts a level (controller.startLevel). */
export class BootScene extends Scene
{
    constructor ()
    {
        super('BootScene');
    }

    create ()
    {
        const manifest = getGameData()?.manifest;
        if (manifest) void loadLevelAssets(this, 'L01', { entries: manifest.entries.filter(e => e.kind === 'audio') });
    }
}
