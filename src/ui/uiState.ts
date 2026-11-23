import { reactive } from 'vue';
import { loadSettings, type Settings } from '../state/SaveService';

export type Screen = 'loading' | 'error' | 'menu' | 'game';

/** UI-only state shared by Vue components (not saved with the game). */
export const uiState = reactive({
    screen: 'loading' as Screen,
    dialogActive: false,      // a line or dialog is shown: inventory dimmed, hint button ignored
    paused: false,
    settings: loadSettings() as Settings,
    cursor: 'default' as string,
    checkpointVisible: false,
    puzzleOpen: false,
    puzzleTakesItems: false,
    ending: null as null | 'card' | 'credits',
});
