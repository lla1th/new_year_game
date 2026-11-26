// Registers the puzzle screens (P-02…) as overlay screens.
import { registerScreen } from '../../game/scenes/OverlayScene';
import { GeneratorScreen } from './GeneratorScreen';
import { GalleryScreen } from './GalleryScreen';

registerScreen('P-02', () => new GeneratorScreen());
registerScreen('S-02b', () => new GalleryScreen());
import { BellsScreen } from './BellsScreen';
import { FrescoScreen } from './FrescoScreen';

registerScreen('P-03', () => new BellsScreen());
registerScreen('fresco', () => new FrescoScreen());
import { CakesScreen, CandyScreen, DeductionScreen, GlazeScreen } from './FactoryScreens';

for (const id of ['l04-mold', 'l04-fuse', 'l04-belt', 'l04-key-story'] as const) {
    registerScreen(id, () => new DeductionScreen(id));
}
registerScreen('l04-cakes', () => new CakesScreen());
registerScreen('l04-candy', () => new CandyScreen());
registerScreen('P-04', () => new GlazeScreen());
import { IceScreen } from './IceScreen';

registerScreen('P-05', () => new IceScreen());
import { ComicScreen } from './ComicScreen';

registerScreen('P-06', () => new ComicScreen());
import { FifteenScreen } from './FifteenScreen';

registerScreen('P-08', () => new FifteenScreen());
import { DrawingScreen } from './DrawingScreen';

registerScreen('drawing', () => new DrawingScreen());
import { ClockScreen } from './ClockScreen';

registerScreen('clock', () => new ClockScreen());
