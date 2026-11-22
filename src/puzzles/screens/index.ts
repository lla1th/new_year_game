// Registers the puzzle screens (P-02…) as overlay screens.
import { registerScreen } from '../../game/scenes/OverlayScene';
import { GarlandScreen } from './GarlandScreen';

registerScreen('P-02', () => new GarlandScreen());
import { BellsScreen } from './BellsScreen';
import { FrescoScreen } from './FrescoScreen';

registerScreen('P-03', () => new BellsScreen());
registerScreen('fresco', () => new FrescoScreen());
import { PipesScreen } from './PipesScreen';

registerScreen('P-04', () => new PipesScreen());
import { IceScreen } from './IceScreen';

registerScreen('P-05', () => new IceScreen());
import { ComicScreen } from './ComicScreen';

registerScreen('P-06', () => new ComicScreen());
import { FifteenScreen } from './FifteenScreen';

registerScreen('P-08', () => new FifteenScreen());
