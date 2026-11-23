import { reactive } from 'vue';
import { GameStateModel } from './GameStateModel';

/** Shared reactive game state: Vue components render it, Phaser scenes change it through its methods. */
export const gameState = reactive(new GameStateModel());
