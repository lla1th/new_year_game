// Registers the puzzle screens (P-02…) as overlay screens.
import { registerScreen } from '../../game/scenes/OverlayScene';
import { GarlandScreen } from './GarlandScreen';

registerScreen('P-02', () => new GarlandScreen());
import { BellsScreen } from './BellsScreen';
import { FrescoScreen } from './FrescoScreen';

registerScreen('P-03', () => new BellsScreen());
registerScreen('fresco', () => new FrescoScreen());
