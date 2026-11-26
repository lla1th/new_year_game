import type { GameObjects } from 'phaser';
import { OverlayScreen } from '../../game/scenes/OverlayScene';
import { CakeOrders, INGREDIENTS } from '../logic/cakes';
import { adjacent, CANDIES, CANDY_COLORS, CandySort, SORT_SIZE, SORT_TARGET } from '../logic/candySort';
import { PIPE_LAYOUT, PIPE_SIZE, PIPE_START, traceGlaze } from '../logic/glazeLine';
import { openSides, type Side } from '../logic/pipes';

interface Control {
    text: GameObjects.Text;
    action: () => void;
}

abstract class FactoryScreen extends OverlayScreen {
    protected panel: GameObjects.Container;
    protected busy = false;
    private controls: Control[] = [];
    private focus = 0;
    protected rowWidth = 1;

    create(container: GameObjects.Container): void {
        this.panel = container;
        this.busy = false;
        this.focus = 0;
        this.draw();
        const keyboard = this.scene.input.keyboard;
        const handle = (event: KeyboardEvent) => {
            if (this.busy || !this.controls.length) return;
            if (event.code === 'Enter' || event.code === 'Space') {
                if (!event.repeat) this.controls[this.focus]?.action();
                return;
            }
            const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -this.rowWidth, ArrowDown: this.rowWidth }[event.code];
            if (step === undefined && event.code !== 'Tab') return;
            event.preventDefault();
            this.focus = (this.focus + (step ?? (event.shiftKey ? -1 : 1)) + this.controls.length) % this.controls.length;
            this.paintFocus();
        };
        keyboard?.on('keydown', handle);
        this.scene.events.once('shutdown', () => keyboard?.off('keydown', handle));
    }

    protected abstract draw(): void;

    protected clear(): void {
        this.panel.removeAll(true);
        this.controls = [];
    }

    protected label(x: number, y: number, value: string, size = 30, color = '#fff2cf'): GameObjects.Text {
        const text = this.scene.add.text(x, y, value, { fontFamily: 'sans-serif', fontSize: `${size}px`, color, align: 'center' }).setOrigin(0.5);
        this.panel.add(text);
        return text;
    }

    protected button(x: number, y: number, value: string, action: () => void, width = 240): void {
        const text = this.label(x, y, value).setFixedSize(width, 58).setStyle({ valign: 'middle' });
        const run = () => { if (!this.busy) action(); };
        const index = this.controls.length;
        this.controls.push({ text, action: run });
        text.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
            this.focus = index;
            run();
        });
        this.paintFocus();
    }

    protected frame(title: string, instructions: string): void {
        this.clear();
        this.label(0, -342, title, 52);
        this.label(0, -282, instructions, 29);
    }

    private paintFocus(): void {
        this.focus = Math.min(this.focus, this.controls.length - 1);
        this.controls.forEach(({ text }, index) => {
            text.setBackgroundColor(index === this.focus ? '#96617b' : '#4b3f68');
        });
    }
}

const LAYER_COLORS = [[0xffd188, 0x895341, 0xc6834e], [0xf57491, 0xf6df67, 0x8f78bf], [0xfff3c2, 0xf29bbc, 0x814d42], [0xe74867, 0xffdf64, 0x9c3761]];
const LAYERS = ['корж', 'начинка', 'глазурь', 'украшение'];

export class CakesScreen extends FactoryScreen {
    private orders = new CakeOrders();
    private message = '';
    private wrong: number | null = null;
    isSolved(): boolean { return this.orders.complete; }
    progressCaption(): string { return `${this.orders.accepted}/3`; }

    protected draw(): void {
        const { recipe, accepted, layers, ready, complete } = this.orders;
        this.frame('Торты по заказу', `Принято ${accepted}/3 · Собирайте торт снизу вверх`);
        if (complete) {
            this.label(0, 0, 'Все торты приняты!', 50);
            return;
        }

        this.label(-290, -185, `Заказ №${accepted + 1}`, 38);
        this.label(280, -185, 'Ваш торт', 38);
        recipe.forEach(([layer, ingredient], index) => {
            const y = 116 - index * 64;
            this.cakeLayer(-290, y, layer, ingredient);
            if (index < layers.length) this.cakeLayer(280, y, layer, layers[index]);
            if (index === this.wrong) this.label(505, y, '!', 42, '#ff91a7');
        });

        if (!ready) {
            const [layer] = recipe[layers.length];
            this.label(0, 173, `Выберите: ${layer}`);
            INGREDIENTS[layer].forEach((name, index) => this.button((index - 1) * 260, 229, name, () => {
                this.orders.add(index);
                this.message = '';
                this.wrong = null;
                this.draw();
            }));
        }
        if (layers.length) this.button(-145, 312, 'Отменить слой', () => {
            this.orders.layers.pop();
            this.message = '';
            this.wrong = null;
            this.draw();
        });
        if (ready) this.button(145, 312, 'Отправить', () => this.submit());
        this.label(0, 372, this.message, 23);
    }

    private cakeLayer(x: number, y: number, kind: keyof typeof INGREDIENTS, ingredient: number): void {
        const color = LAYER_COLORS[LAYERS.indexOf(kind)][ingredient];
        const layer = this.scene.add.rectangle(x, y, 362, 57, color).setStrokeStyle(4, 0x4c3042);
        this.panel.add(layer);
        this.label(x, y, `${kind} · ${INGREDIENTS[kind][ingredient]}`, 26, '#20142b').setStroke('#fff2cf', 3);
    }

    private submit(): void {
        const layers = this.orders.layers;
        const recipe = this.orders.recipe;
        const result = this.orders.submit();
        if (typeof result === 'number') {
            this.wrong = result;
            this.message = 'Исправьте отмеченный слой по карточке.';
            this.draw();
        } else if (result === 'correct') {
            this.busy = true;
            this.clear();
            this.label(0, -200, 'Заказ принят', 52);
            recipe.forEach(([layer], i) => this.cakeLayer(-230, 100 - 62 * i, layer, layers[i]));
            this.scene.tweens.add({
                targets: this.panel.list.slice(1), x: '+=730', alpha: 0, duration: 540,
                onComplete: () => {
                    this.busy = false;
                    this.message = '';
                    if (this.isSolved()) this.solve();
                    else this.draw();
                },
            });
        }
    }
}

export class CandyScreen extends FactoryScreen {
    protected rowWidth = SORT_SIZE;
    private sort = new CandySort();
    private selected: number | null = null;
    private message = 'Выберите две соседние конфеты.';
    isSolved(): boolean { return this.sort.won; }

    protected draw(): void {
        this.drawBoard(this.sort.board);
        if (this.sort.lost) this.button(350, 125, 'Повторить', () => {
            this.sort = new CandySort();
            this.selected = null;
            this.message = 'Выберите две соседние конфеты.';
            this.draw();
        });
    }

    private drawBoard(board: number[], cleared: readonly number[] = [], falls: number[] = []): void {
        this.frame('Сортировка конфет', `Соберите по 8 конфет каждого указанного вида · Ходов: ${this.sort.moves}`);
        board.forEach((kind, index) => {
            const x = -475 + index % SORT_SIZE * 75;
            const y = -190 + Math.floor(index / SORT_SIZE) * 75;
            const cell = this.scene.add.rectangle(x, y, 67, 67, index === this.selected ? 0x96617b : 0x383455)
                .setStrokeStyle(3, index === this.selected ? 0xffe39b : 0x655579);
            this.panel.add(cell);
            const candy = this.label(x, y, CANDIES[kind], 53, CANDY_COLORS[kind]);
            if (cleared.includes(index)) this.scene.tweens.add({ targets: candy, alpha: 0, scale: 1.35, duration: 145 });
            if (falls[index]) {
                candy.y -= falls[index] * 58;
                this.scene.tweens.add({ targets: candy, y, duration: 190, ease: 'Quad.easeIn' });
            }
            if (!this.busy && !this.sort.lost) {
                this.button(x, y, ' ', () => this.choose(index), 67);
                // A translucent highlight keeps the candy legible under keyboard focus.
                const focus = this.panel.list.at(-1) as GameObjects.Text;
                focus.setAlpha(0.25);
            }
        });
        this.sort.counts.forEach((count, kind) => {
            this.label(340, -160 + kind * 83, `${CANDIES[kind]}  ${Math.min(count, SORT_TARGET)}/${SORT_TARGET}${count >= SORT_TARGET ? '  ✓' : ''}`, 42, CANDY_COLORS[kind]);
        });
        this.label(0, 330, this.sort.lost ? 'Ходы закончились. Недобранные виды видны справа.' : this.message, 27);
    }

    private choose(index: number): void {
        const from = this.selected;
        if (from === null || !adjacent(from, index)) {
            this.selected = from === index ? null : index;
            this.draw();
            return;
        }
        this.selected = null;
        const turn = this.sort.play(from, index);
        if (!turn) {
            this.message = 'Ряд не сложился. Ход сохранён.';
            this.draw();
            return;
        }
        this.busy = true;
        this.message = '';
        let board = turn.swap;
        const animate = (index: number) => {
            const cascade = turn.cascades[index];
            if (!cascade) {
                this.busy = false;
                if (this.isSolved()) this.solve();
                else {
                    this.message = turn.shuffled ? 'Нет доступных ходов. Конфеты перемешаны.' : 'Выберите две соседние конфеты.';
                    this.draw();
                }
                return;
            }
            this.drawBoard(board, cascade.cleared);
            this.scene.time.delayedCall(150, () => {
                board = cascade.board;
                this.drawBoard(board, [], cascade.falls);
                this.scene.time.delayedCall(200, () => animate(index + 1));
            });
        };
        animate(0);
    }
}

const ARMS: Record<Side, [number, number]> = { U: [0, -43], R: [43, 0], D: [0, 43], L: [-43, 0] };

export class GlazeScreen extends FactoryScreen {
    protected rowWidth = PIPE_SIZE;
    private rotations = [...PIPE_START];
    private undo: number[] = [];
    private flow: number[] = [];
    private leak: number | null = null;
    private won = false;
    isSolved(): boolean { return this.won; }

    protected draw(): void {
        this.frame('Линия глазирования', 'Поверните трубы и нажмите «Пуск»');
        const graphics = this.scene.add.graphics();
        this.panel.add(graphics);
        PIPE_LAYOUT.forEach((type, i) => {
            const x = -180 + i % PIPE_SIZE * 88;
            const y = -184 + Math.floor(i / PIPE_SIZE) * 88;
            graphics.fillStyle(type ? 0x423553 : 0x272741).fillRoundedRect(x - 42, y - 42, 84, 84, 12);
            if (!type) return;
            const pen = this.leak === i ? 0xff9a92 : this.flow.includes(i) ? 0xf9a0d7 : 0x83ced0;
            for (const side of openSides(type, this.rotations[i])) {
                const [dx, dy] = ARMS[side];
                graphics.lineStyle(22, 0x24223d).lineBetween(x, y, x + dx, y + dy);
                graphics.lineStyle(14, pen).lineBetween(x, y, x + dx, y + dy);
            }
            graphics.fillStyle(pen).fillCircle(x, y, 7);
            if (!this.busy) {
                this.button(x, y, ' ', () => {
                    this.undo.push(i);
                    this.rotate(i, 1);
                }, 82);
                (this.panel.list.at(-1) as GameObjects.Text).setFixedSize(82, 82).setAlpha(0.25);
            }
            if (this.leak === i) {
                const warning = this.label(x + 29, y - 30, '!', 30, '#ffafa7');
                this.scene.tweens.add({ targets: warning, alpha: 0.2, duration: 250, yoyo: true, repeat: 2 });
            }
        });
        this.label(-325, -184, 'Бак →');
        this.label(323, 168, '→ Линия');
        if (!this.busy) {
            if (this.undo.length) this.button(-170, 270, 'Отменить поворот', () => this.rotate(this.undo.pop()!, 3), 310);
            this.button(170, 270, 'Пуск', () => this.start());
        }
        this.label(0, 351, this.leak === null ? (this.won ? 'Линия запущена!' : '') : 'Поток остановился у отмеченного стыка.', 26);
    }

    private rotate(i: number, amount: number): void {
        this.rotations[i] = (this.rotations[i] + amount) % 4;
        this.flow = [];
        this.leak = null;
        this.services.sfx('sfx_pipe_rotate');
        this.draw();
    }

    private start(): void {
        const { path, won, leak } = traceGlaze(this.rotations);
        this.busy = true;
        this.won = won;
        this.leak = null;
        const pulse = (n: number) => {
            this.flow = path.slice(0, n);
            this.draw();
            if (n < path.length) this.scene.time.delayedCall(85, () => pulse(n + 1));
            else this.scene.time.delayedCall(250, () => {
                this.busy = false;
                this.leak = leak;
                if (won) this.solve();
                else this.draw();
            });
        };
        pulse(0);
    }
}
