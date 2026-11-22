import { AUTO, Game, Scale, Types } from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './data/types';
import { BootScene } from './scenes/BootScene';
import { LevelScene } from './scenes/LevelScene';
import { OverlayScene } from './scenes/OverlayScene';
import { TransitionScene } from './scenes/TransitionScene';
import './levels/visuals';
import { LEVELS } from './levels';
import { isDebug } from './debug';
import { AudioManager, setAudio, type SoundManagerLike } from './audio/AudioManager';

LevelScene.resolveLevel = id => LEVELS[id];

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
    scene: [BootScene, LevelScene, OverlayScene, TransitionScene],
};

const StartGame = (parent: string): Game => {
    const game = new Game({ ...config, scale: { ...config.scale, parent } });
    const audio = new AudioManager(game.sound as unknown as SoundManagerLike, key => game.cache.audio.exists(key), () => performance.now());
    setAudio(audio);
    if (isDebug()) (window as unknown as { __audio?: AudioManager }).__audio = audio;   // debug-only handle for checks
    game.events.on('step', () => audio.update());
    game.events.once('destroy', () => setAudio(null));
    return game;
};

export default StartGame;
