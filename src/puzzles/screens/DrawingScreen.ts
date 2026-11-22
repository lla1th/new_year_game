import type { GameObjects } from 'phaser';
import { getGameData } from '../../game/data/gameData';
import { OverlayScreen } from '../../game/scenes/OverlayScene';

/** L07 close-up: the cat's crumpled drawing — the cat by the Clock, the caption «Хранительница» crossed out. */
export class DrawingScreen extends OverlayScreen {
    create(container: GameObjects.Container): void {
        const s = this.scene;
        const t = (k: string) => getGameData()?.texts.t(k) ?? k;
        container.add(s.add.rectangle(0, -20, 760, 600, 0xfff8e1).setStrokeStyle(4, 0xbcaaa4).setAngle(-2));
        container.add(s.add.circle(-120, -120, 110, 0xffd54f).setStrokeStyle(6, 0x6d4c41));                    // the Clock
        container.add(s.add.rectangle(140, -60, 140, 200, 0xa1887f).setStrokeStyle(4, 0x5d4037));               // the cat
        const caption = s.add.text(0, 170, t('l07.drawing.caption'), { fontFamily: 'cursive, sans-serif', fontSize: '52px', color: '#4e342e' }).setOrigin(0.5);
        container.add(caption);
        const strike = s.add.rectangle(0, 170, caption.width + 30, 8, 0xd32f2f).setAngle(-4);                      // crossed out
        container.add(strike);
    }
}
