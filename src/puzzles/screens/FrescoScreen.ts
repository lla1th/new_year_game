import type { GameObjects } from 'phaser';
import { getGameData } from '../../game/data/gameData';
import { OverlayScreen } from '../../game/scenes/OverlayScene';
import { BELL_ORDER } from '../logic/bells';

/** Close-up of the fresco: four pictures in the bells' order. Opening it sets L03_FRESCO_SEEN. */
export class FrescoScreen extends OverlayScreen {
    create(container: GameObjects.Container): void {
        const s = this.scene;
        const tb = getGameData()?.texts;
        BELL_ORDER.forEach((sym, i) => {
            const x = (i % 2 - 0.5) * 256;
            const y = i < 2 ? -30 : 224;
            const caption = `${i + 1}. ${tb?.t(`l03.fresco.${sym}`) ?? sym}`;
            container.add(s.add.text(x, y, caption, {
                fontFamily: 'sans-serif', fontSize: '28px', color: '#ffe5b5',
                backgroundColor: '#292336', padding: { x: 8, y: 2 },
            }).setOrigin(0.5));
        });
        const st = this.services.state;
        if (!st.hasFlag('L03_FRESCO_SEEN')) {
            st.setFlag('L03_FRESCO_SEEN');
            this.services.progress();
        }
    }
}
