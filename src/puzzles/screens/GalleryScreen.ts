import type { GameObjects } from 'phaser';
import { getGameData } from '../../game/data/gameData';
import { OverlayScreen } from '../../game/scenes/OverlayScene';
import {
    DEFAULT_RULES, beatsRecord, boardWithKeeperName, boardWithPlayer, displayName, scoreHits,
    type BalloonKind, type BoardRow, type GalleryRules,
} from '../logic/gallery';

const AREA = { w: 900, h: 640, x: -120, y: 20 };
const SPAWN_MS = 450;
const COLORS: Record<BalloonKind, number> = { red: 0xe53935, gold: 0xffc107, black: 0x212121 };
const MARKS: Record<BalloonKind, string> = { red: '●', gold: '★', black: '✖' };   // a second cue besides colour
const t = (key: string) => getGameData()?.texts.t(key) ?? key;

/** S-02b «Тир»: balloons fly across the panel, a click is a shot; beat the record of the first row to win. */
export class GalleryScreen extends OverlayScreen {
    private won = false;
    private container: GameObjects.Container;
    private shotsLeft = 0;
    private hits: BalloonKind[] = [];
    private info: GameObjects.Text;
    private spawner: { remove(): void } | null = null;
    private running = false;

    isSolved(): boolean { return this.won; }

    private get rules(): GalleryRules { return getGameData()?.gallery.rules ?? DEFAULT_RULES; }

    private get board(): BoardRow[] {
        const data = getGameData();
        const n = this.services.state.spitzName;
        const name = n === null || !data ? null : data.texts.t(`name.option.${n}`);
        return boardWithKeeperName(data?.gallery.board ?? [], name);
    }

    create(container: GameObjects.Container): void {
        this.container = container;
        const s = this.scene;
        const bg = s.add.rectangle(AREA.x, AREA.y, AREA.w, AREA.h, 0x263238, 0.25)
            .setStrokeStyle(4, 0xd3a877).setInteractive();
        bg.on('pointerdown', () => this.shoot(null));   // a miss still costs a shot
        container.add(bg);
        this.info = s.add.text(AREA.x - AREA.w / 2 + 20, AREA.y - AREA.h / 2 + 12, '', { fontFamily: 'sans-serif', fontSize: '34px', color: '#ffffff' });
        container.add(this.info);
        this.drawBoard(this.board);
        this.start();
    }

    onClosed(): void {
        this.stop();
    }

    private drawBoard(board: BoardRow[]): void {
        const s = this.scene;
        const x = 440;
        this.container.add(s.add.text(x, -330, t('l02.gallery.board'), { fontFamily: 'sans-serif', fontSize: '30px', color: '#ffd75e' }).setOrigin(0.5, 0));
        board.slice(0, 5).forEach((row, i) => {
            const pts = typeof row.points === 'number' ? String(row.points) : '—';
            this.container.add(s.add.text(x - 150, -270 + i * 56, `${i + 1}. ${displayName(row)}  ${pts}`, { fontFamily: 'sans-serif', fontSize: '28px', color: '#ffffff' }));
        });
    }

    private start(): void {
        this.stop();
        this.hits = [];
        this.shotsLeft = this.rules.shots;
        this.running = true;
        this.updateInfo();
        this.spawner = this.scene.time.addEvent({ delay: SPAWN_MS, loop: true, callback: () => this.spawn() });
    }

    private stop(): void {
        this.running = false;
        this.spawner?.remove();
        this.spawner = null;
    }

    private updateInfo(): void {
        this.info.setText(`${t('l02.gallery.shots')}: ${this.shotsLeft}   ${t('l02.gallery.score')}: ${scoreHits(this.hits, this.rules)}`);
    }

    private spawn(): void {
        if (!this.running) return;
        const s = this.scene;
        const r = Math.random();
        const kind: BalloonKind = r < 0.2 ? 'black' : r < 0.45 ? 'gold' : 'red';
        const y = AREA.y - AREA.h / 2 + 100 + Math.random() * (AREA.h - 200);
        const left = AREA.x - AREA.w / 2;
        const balloon = s.add.container(left - 40, y, [
            s.add.circle(0, 0, 44, COLORS[kind], 1).setStrokeStyle(4, 0xffffff, 0.7),
            s.add.text(0, 0, MARKS[kind], { fontFamily: 'sans-serif', fontSize: '36px', color: '#ffffff' }).setOrigin(0.5),
        ]);
        balloon.setSize(88, 88).setInteractive({ useHandCursor: true });
        balloon.on('pointerdown', () => { if (this.shoot(kind)) balloon.destroy(); });
        this.container.add(balloon);
        s.tweens.add({ targets: balloon, x: left + AREA.w + 40, duration: 2400 + Math.random() * 1400, onComplete: () => balloon.destroy() });
    }

    /** One click = one shot. Returns true if the shot was taken. */
    private shoot(kind: BalloonKind | null): boolean {
        if (!this.running || this.shotsLeft <= 0) return false;
        this.shotsLeft--;
        if (kind) {
            this.hits.push(kind);
            this.services.sfx(kind === 'black' ? 'sfx_bulb_wrong' : 'sfx_bulb_in');
        }
        this.updateInfo();
        if (this.shotsLeft === 0) this.scene.time.delayedCall(700, () => this.finishGame());
        return true;
    }

    private finishGame(): void {
        if (!this.running) return;
        this.stop();
        const score = scoreHits(this.hits, this.rules);
        const data = getGameData();
        if (beatsRecord(score, this.board, this.rules)) {
            this.won = true;
            this.container.add(this.scene.add.text(AREA.x, AREA.y, `${t('l02.gallery.score')}: ${score}`, { fontFamily: 'sans-serif', fontSize: '64px', color: '#ffd75e', backgroundColor: '#000000aa' }).setOrigin(0.5));
            const mine = boardWithPlayer(this.board, data?.characters.names.ksyusha ?? 'Ксюша', score);
            this.drawBoard(mine);
            void this.services.say('spitz', 'l02.spitz.praise')
                .then(() => this.services.say('ksyusha', 'l02.ksy.win'))
                .then(() => this.solve());
            return;
        }
        void this.services.say('vendor', 'l02.vendor.lose');
        this.start();   // an unlimited number of attempts, no penalty
    }
}
