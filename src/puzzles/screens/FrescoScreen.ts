import type { GameObjects } from 'phaser';
import { getGameData } from '../../game/data/gameData';
import { OverlayScreen } from '../../game/scenes/OverlayScene';
import { BELL_ORDER } from '../logic/bells';
import { BELL_MARK } from './BellsScreen';

/** Close-up of the fresco: four pictures in the bells' order. Opening it sets L03_FRESCO_SEEN. */
export class FrescoScreen extends OverlayScreen {
    create(container: GameObjects.Container): void {
        const s = this.scene;
        const tb = getGameData()?.texts;
        BELL_ORDER.forEach((sym, i) => {
            const x = (i - 1.5) * 260;
            container.add(s.add.rectangle(x, 0, 220, 300, 0xd7ccc8).setStrokeStyle(6, 0x6d4c41));
            container.add(s.add.text(x, -30, BELL_MARK[sym], { fontFamily: 'sans-serif', fontSize: '96px', color: '#5d4037' }).setOrigin(0.5));
            container.add(s.add.text(x, 100, tb?.t(`l03.fresco.${sym}`) ?? sym, { fontFamily: 'sans-serif', fontSize: '28px', color: '#3e2723' }).setOrigin(0.5));
            if (i < 3) container.add(s.add.text(x + 130, 0, '→', { fontFamily: 'sans-serif', fontSize: '48px', color: '#ffffff' }).setOrigin(0.5));
        });
        const st = this.services.state;
        if (!st.hasFlag('L03_FRESCO_SEEN')) {
            st.setFlag('L03_FRESCO_SEEN');
            this.services.progress();
        }
    }
}
