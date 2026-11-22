// Registers the puzzle screens (P-02…) as overlay screens.
import { registerScreen } from '../../game/scenes/OverlayScene';
import { GarlandScreen } from './GarlandScreen';

registerScreen('P-02', () => new GarlandScreen());
