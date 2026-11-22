import { AUTO, Game, Scale, Types } from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './data/types';
import { BootScene } from './scenes/BootScene';
import { LevelScene } from './scenes/LevelScene';

const config: Types.Core.GameConfig = {
    type: AUTO,
    backgroundColor: '#000000',
    scale: {
        parent: 'game-container',
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
    },
    scene: [BootScene, LevelScene],
};

const StartGame = (parent: string): Game => {
    return new Game({ ...config, scale: { ...config.scale, parent } });
};

export default StartGame;
