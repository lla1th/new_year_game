import { Input, type GameObjects, type Scene } from 'phaser';
import { showVisual } from '../assets/anims';
import { ensureTexture } from '../assets/placeholder';
import { GAME_WIDTH, type FlagId } from '../data/types';
import type { SideRoomSpec, SideRoomTarget } from '../script/types';
import { drawFactoryWorker } from './factoryWorker';

const FLOOR = 889;
const BELT = 660;
const PORTAL_MARGIN = 100;
const SPEED = 575;
const PANEL_RANGE = 165;
const TARGET_RANGE = 120;
const INK = 0x392439;
const CREAM = 0xffefc6;

const PALETTES = {
    cakes: { wall: 0xf9c499, shade: 0xec9d8d, accent: 0xc44e77, symbol: '▤' },
    candy: { wall: 0xf5adaf, shade: 0xd681a2, accent: 0x985397, symbol: '◆' },
    glaze: { wall: 0xb4d8c6, shade: 0x8fb6a9, accent: 0x47888d, symbol: '✦' },
};

export class FactoryRoom {
    readonly actor: GameObjects.Sprite;
    private readonly width: number;
    private readonly panelX: number;
    private readonly keys?: Record<'left' | 'right' | 'a' | 'd' | 'use', Input.Keyboard.Key>;
    private readonly shadow: GameObjects.Ellipse;
    private readonly panelOutline: GameObjects.Graphics;
    private readonly door: GameObjects.Graphics;
    private readonly prompt: GameObjects.Text;
    private readonly direction: GameObjects.Text;
    private readonly cargo: GameObjects.Container[];
    private readonly targets: { def: SideRoomTarget; x: number; label: GameObjects.Text; prop?: GameObjects.Graphics }[];
    private readonly slats: GameObjects.Graphics;
    private readonly machineFlow: GameObjects.Graphics;
    private target: number | null = null;
    private conveyorElapsed = 0;
    private walking = false;
    private phase = 0;
    private facingLeft: boolean;
    private stepTime = 0;

    constructor(
        private readonly scene: Scene,
        readonly spec: SideRoomSpec,
        fromRight: boolean,
        private readonly completed: () => boolean,
        private readonly progress: () => string,
        private readonly hasFlag: (flag: FlagId) => boolean,
        private readonly action: (id: string) => void,
        private readonly footstep: () => void,
    ) {
        this.width = Math.round(GAME_WIDTH * spec.width);
        this.panelX = this.width * 0.59;
        this.facingLeft = fromRight;
        if (scene.input.keyboard) {
            const key = (code: number) => scene.input.keyboard!.addKey(code, false);
            const { LEFT, RIGHT, A, D, E } = Input.Keyboard.KeyCodes;
            this.keys = { left: key(LEFT), right: key(RIGHT), a: key(A), d: key(D), use: key(E) };
        }

        this.drawBackdrop();
        this.slats = scene.add.graphics().setDepth(13);
        this.cargo = Array.from({ length: Math.ceil(this.width / 260) + 1 }, (_, i) => this.makeCargo(i));
        this.machineFlow = scene.add.graphics().setDepth(15);
        this.drawMachine();
        this.targets = spec.targets.map(def => {
            const x = this.width * def.at;
            if (def.kind === 'worker') {
                drawFactoryWorker(scene, def.id, x, FLOOR);
                return { def, x, label: this.text(x, 629, def.label, 33).setDepth(23) };
            }
            const prop = scene.add.graphics().setDepth(21);
            prop.fillStyle(INK).fillRoundedRect(x - 60, 733, 120, 114, 19);
            prop.fillStyle(0x9a6359).fillRoundedRect(x - 53, 740, 106, 100, 15);
            prop.fillStyle(CREAM).fillCircle(x, 774, 27);
            const label = this.text(x, 699, `${def.icon}  ${def.label}`, 32).setDepth(23);
            return { def, x, label, prop };
        });
        this.panelOutline = scene.add.graphics().setDepth(22);
        this.door = scene.add.graphics().setDepth(21);
        this.prompt = this.text(this.panelX, 572, '', 37).setDepth(26);
        this.direction = this.text(1812, 191, '', 30).setOrigin(1, 0.5).setScrollFactor(0).setDepth(30);
        const spawn = fromRight ? this.width - 245 : 245;
        this.shadow = scene.add.ellipse(spawn, FLOOR, 145, 23, INK, 0.3).setDepth(23);
        const idle = 'ksyusha_w2_dr_idle';
        this.actor = scene.add.sprite(spawn, FLOOR, ensureTexture(scene, idle, 90, 360, 'Ксюша')).setOrigin(0.5, 1).setDepth(24);
        this.pose(false, true);
        scene.cameras.main.setScroll(fromRight ? this.width - GAME_WIDTH : 0, 0);
        this.drawForeground();
    }

    get isWalking(): boolean { return this.walking; }

    pointer(worldX: number, worldY: number, blocked: boolean): void {
        if (blocked || worldY < 350) return;
        const item = this.targets.find(t => this.visible(t.def) && Math.abs(worldX - t.x) < 120 && worldY >= 600 && worldY < 865);
        if (item) {
            if (Math.abs(this.actor.x - item.x) <= TARGET_RANGE) this.interact(item.def.id);
            else this.target = item.x;
            return;
        }
        if (Math.abs(worldX - this.panelX) < 175 && worldY < 815) {
            if (this.nearPanel()) this.interact('panel');
            else this.target = this.panelX;
            return;
        }
        this.target = Math.max(0, Math.min(this.width, worldX));
        if (worldX > this.width - 220 && this.completed()) this.target = this.width;
        if (worldX < 220 && this.spec.left) this.target = 0;
    }

    update(delta: number, blocked: boolean): void {
        const dt = Math.min(delta, 50);
        if (this.spec.theme !== 'glaze' || this.completed()) this.conveyorElapsed += dt;
        this.drawConveyor();
        const keys = this.keys;
        const use = keys && Input.Keyboard.JustDown(keys.use);
        if (!blocked && use) {
            const target = this.nearbyTarget();
            if (target || this.nearPanel()) {
                this.interact(target?.def.id ?? 'panel');
                return;
            }
        }

        const right = Number(!!keys && (keys.right.isDown || keys.d.isDown));
        const left = Number(!!keys && (keys.left.isDown || keys.a.isDown));
        if (right || left) this.target = null;
        const x = this.actor.x;
        const target = this.target;
        const travel = SPEED * dt / 1000;
        const step = right || left ? (right - left) * travel :
            target === null ? 0 : Math.max(-travel, Math.min(travel, target - x));
        const min = this.spec.left ? PORTAL_MARGIN : 180;
        const max = this.completed() ? this.width - PORTAL_MARGIN : this.width - 230;
        const next = blocked ? x : Math.max(min, Math.min(max, x + step));
        const moving = next !== x;
        const turned = moving && this.facingLeft !== (next < x);
        if (moving) this.facingLeft = next < x;
        this.pose(moving, turned);
        this.phase = moving ? this.phase + dt : 0;
        this.actor.setPosition(next, FLOOR - Math.abs(Math.sin(this.phase / 85)) * 7);
        this.shadow.x = next;
        if (moving) {
            this.stepTime += dt;
            if (this.stepTime >= 350) {
                this.stepTime %= 350;
                this.footstep();
            }
        }
        if (!blocked) this.follow(dt);
        this.drawForeground();
        if (moving && next <= min && this.spec.left) this.action('left');
        if (moving && next >= max && this.completed()) this.action('right');
        if (next === target || (!moving && !blocked)) this.target = null;
    }

    private follow(dt: number): void {
        const cam = this.scene.cameras.main;
        const local = this.actor.x - cam.scrollX;
        const excess = local - Math.max(GAME_WIDTH * 0.35, Math.min(GAME_WIDTH * 0.65, local));
        const next = cam.scrollX + excess * (1 - Math.exp(-dt / 105));
        cam.setScroll(Math.max(0, Math.min(this.width - GAME_WIDTH, next)), 0);
    }

    private pose(moving: boolean, force: boolean): void {
        if (!force && moving === this.walking) return;
        this.walking = moving;
        const side = this.facingLeft ? 'l' : 'r';
        const directional = `ksyusha_w2_${side}_${moving ? 'walk' : 'idle'}`;
        const hasSide = this.scene.anims.exists(directional);
        const key = hasSide ? directional : 'ksyusha_w2_dr_idle';
        showVisual(this.actor, key);
        this.actor.setFlipX(!hasSide && this.facingLeft).setScale(225 / this.actor.height);
    }

    private nearPanel(): boolean {
        return Math.abs(this.actor.x - this.panelX) <= PANEL_RANGE;
    }

    private visible(def: SideRoomTarget): boolean {
        return (!def.when || this.hasFlag(def.when)) && (!def.unless || !this.hasFlag(def.unless)) &&
            (def.kind === 'worker' || !this.completed());
    }

    private nearbyTarget() {
        return this.targets.find(t => this.visible(t.def) && Math.abs(this.actor.x - t.x) <= TARGET_RANGE);
    }

    private interact(id: string): void {
        this.target = null;
        if (id !== 'panel' || !this.completed()) this.action(id);
    }

    private text(x: number, y: number, value: string, size: number): GameObjects.Text {
        return this.scene.add.text(x, y, value, {
            fontFamily: 'sans-serif', fontStyle: 'bold', fontSize: `${size}px`, color: '#fff2d1',
            stroke: '#392439', strokeThickness: 7, align: 'center',
        }).setOrigin(0.5);
    }

    private drawBackdrop(): void {
        const { wall, shade, accent } = PALETTES[this.spec.theme];
        const far = this.scene.add.graphics().setScrollFactor(0.35).setDepth(1);
        far.fillStyle(wall).fillRect(0, 0, this.width, FLOOR);
        far.fillStyle(shade).fillRect(0, 163, this.width, 18).fillRect(0, 480, this.width, 106);
        for (let x = 110; x < this.width; x += 386) {
            far.fillStyle(shade).fillRoundedRect(x, 232, 244, 212, 66);
            far.fillStyle(0xffe5b2).fillRoundedRect(x + 14, 248, 216, 180, 55);
            far.lineStyle(12, shade).lineBetween(x + 121, 249, x + 121, 427).lineBetween(x + 15, 338, x + 229, 338);
        }
        const mid = this.scene.add.graphics().setDepth(3).setScrollFactor(0.65);
        mid.lineStyle(32, INK).lineBetween(0, 108, this.width, 108);
        mid.lineStyle(21, accent).lineBetween(0, 103, this.width, 103);
        for (let x = 440; x < this.width; x += 780) {
            mid.lineStyle(26, INK).lineBetween(x, 108, x, 556);
            mid.lineStyle(15, accent).lineBetween(x, 105, x, 556);
            mid.fillStyle(INK).fillEllipse(x, 552, 186, 58);
            mid.fillStyle(CREAM).fillEllipse(x, 559, 130, 25);
        }
        const floor = this.scene.add.graphics().setDepth(8);
        floor.fillStyle(0x69485e).fillRect(0, FLOOR - 20, this.width, 220);
        floor.fillStyle(0x986879).fillRect(0, FLOOR - 16, this.width, 61);
        floor.lineStyle(7, INK).lineBetween(0, FLOOR - 20, this.width, FLOOR - 20);
        floor.lineStyle(3, 0x815568);
        for (let x = 0; x <= this.width; x += 124) floor.lineBetween(x, FLOOR + 51, x - 52, 1080);
        floor.lineBetween(0, 1015, this.width, 1015);
        floor.fillStyle(INK).fillRoundedRect(-28, BELT + 37, this.width + 56, 124, 36);
        floor.fillStyle(0x6d576e).fillRoundedRect(-20, BELT + 46, this.width + 40, 97, 29);
        for (let x = 44; x <= this.width; x += 256) {
            floor.fillStyle(INK).fillCircle(x, BELT + 94, 34);
            floor.fillStyle(0xc09282).fillCircle(x, BELT + 94, 24);
            floor.fillStyle(0xffcd94).fillCircle(x - 4, BELT + 88, 8);
        }
        this.text(114, 189, this.spec.title, 46).setOrigin(0, 0.5).setScrollFactor(0).setDepth(20);
        this.text(108, 965, '← →  Ходьба   ·   E  Взаимодействие   ·   Касание пола  Идти', 26)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(29);
    }

    private drawMachine(): void {
        const x = this.panelX;
        const { accent, symbol } = PALETTES[this.spec.theme];
        const machine = this.scene.add.graphics().setDepth(18);
        machine.fillStyle(INK).fillRoundedRect(x - 149, 689, 298, 169, 34);
        machine.fillStyle(accent).fillRoundedRect(x - 139, 698, 278, 150, 28);
        machine.fillStyle(CREAM).fillRoundedRect(x - 119, 716, 238, 70, 20);
        machine.fillStyle(INK).fillCircle(x - 74, 813, 16).fillCircle(x, 813, 16).fillCircle(x + 74, 813, 16);
        machine.fillStyle(0xffaa85).fillCircle(x - 74, 810, 10).fillCircle(x + 74, 810, 10);
        this.text(x, 749, 'ПАНЕЛЬ', 33).setDepth(19);
        this.text(x, 486, `${symbol}  ${this.spec.action}`, 42).setDepth(19);
        const props = this.scene.add.graphics().setDepth(12);
        switch (this.spec.theme) {
            case 'cakes':
                for (let i = 0; i < 3; i++) {
                    const cardX = x - 222 + i * 145;
                    props.fillStyle(INK).fillRoundedRect(cardX, 278, 126, 132, 12);
                    props.fillStyle(CREAM).fillRoundedRect(cardX + 7, 284, 112, 119, 9);
                    props.fillStyle(accent).fillRoundedRect(cardX + 22, 343, 81, 33, 7);
                    props.fillStyle(0xf7aaad).fillRoundedRect(cardX + 31, 328, 64, 22, 7);
                }
                break;
            case 'candy':
                for (let i = 0; i < 3; i++) {
                    const bin = x - 224 + i * 150;
                    props.fillStyle(INK).fillRoundedRect(bin, 274, 123, 135, 22);
                    props.fillStyle([0xf195aa, 0x91d8de, 0xffd276][i]).fillRoundedRect(bin + 9, 284, 105, 114, 15);
                    this.text(bin + 62, 339, ['●', '◆', '▲'][i], 52).setDepth(13);
                }
                break;
            case 'glaze':
                props.fillStyle(INK).fillRoundedRect(x - 478, 297, 225, 341, 112);
                props.fillStyle(accent).fillRoundedRect(x - 465, 309, 199, 316, 99);
                props.lineStyle(39, INK).lineBetween(x - 298, 548, x + 380, 548).lineBetween(x + 380, 532, x + 380, 659);
                props.lineStyle(26, 0xb1bd9d).lineBetween(x - 298, 548, x + 380, 548).lineBetween(x + 380, 536, x + 380, 654);
                this.text(x - 365, 432, 'ГЛАЗУРЬ', 35).setDepth(13);
                break;
        }
    }

    private makeCargo(i: number): GameObjects.Container {
        const g = this.scene.add.graphics();
        const color = [0xe48783, 0xffca7a, 0xbb9acb, 0x93cfca][i % 4];
        if (this.spec.theme === 'candy') {
            g.fillStyle(INK).fillRoundedRect(-51, -36, 102, 43, 12);
            g.fillStyle(0xffc780).fillRoundedRect(-47, -31, 94, 32, 9);
            g.fillStyle(color).fillCircle(-25, -40, 20).fillCircle(21, -41, 21);
            g.fillStyle(CREAM).fillCircle(-31, -46, 5).fillCircle(15, -47, 5);
            return this.scene.add.container(0, BELT + 40, [g]).setDepth(14);
        }
        g.fillStyle(INK).fillRoundedRect(-53, -49, 106, 55, 20);
        g.fillStyle(color).fillRoundedRect(-46, -43, 92, 41, 15);
        g.fillStyle(CREAM).fillRoundedRect(-45, -45, 90, 12, 6);
        const icing = this.scene.add.graphics().setName('icing');
        icing.fillStyle(0xff9ac4).fillRoundedRect(-45, -48, 90, 20, 8).fillCircle(14, -28, 7);
        return this.scene.add.container(0, BELT + 40, [g, icing]).setDepth(14);
    }

    private drawConveyor(): void {
        const done = this.completed();
        const g = this.slats.clear().fillStyle(0x745465).fillRect(0, BELT + 14, this.width, 36);
        g.lineStyle(7, 0xc69b93);
        for (let x = (this.conveyorElapsed * 0.154) % 60 - 60; x < this.width; x += 60) {
            g.lineBetween(x, BELT + 18, x + 17, BELT + 43);
        }
        this.cargo.forEach((cargo, i) => {
            cargo.x = ((this.conveyorElapsed * 0.154 + i * 260) % (this.cargo.length * 260)) - 90;
            cargo.setVisible(done || this.spec.theme === 'glaze');
            const icing = cargo.getByName('icing') as GameObjects.Graphics | null;
            icing?.setVisible(this.spec.theme === 'cakes' || (this.spec.theme === 'glaze' && done && cargo.x > this.panelX + 380));
        });
        const flow = this.machineFlow.clear();
        if (this.spec.theme === 'glaze' && done) {
            flow.lineStyle(10, 0xff9ac4).lineBetween(this.panelX - 254, 548, this.panelX + 380, 548)
                .lineBetween(this.panelX + 380, 546, this.panelX + 380, BELT + 15);
        }
    }

    private drawForeground(): void {
        const done = this.completed();
        const target = this.nearbyTarget();
        const near = !target && this.nearPanel();
        for (const t of this.targets) {
            const visible = this.visible(t.def);
            t.label.setVisible(visible);
            t.prop?.setVisible(visible);
        }
        this.panelOutline.clear();
        if (near) this.panelOutline.lineStyle(7, CREAM).strokeRoundedRect(this.panelX - 148, 688, 296, 170, 34);
        this.panelOutline.fillStyle(done ? 0x83e6a5 : 0xffbc78).fillCircle(this.panelX, 810, 11);
        const result = done ? '✓ Готово' : `E / касание · ${this.spec.action}`;
        this.prompt.setPosition(target?.x ?? this.panelX, target ? 565 : 572)
            .setText(target ? (target.def.kind === 'worker' ? 'E / касание · Поговорить' : 'E / касание · Взять') : result)
            .setVisible(!!target || near || done);
        this.door.clear();
        this.drawDoor(108, !!this.spec.left);
        this.drawDoor(this.width - 116, done);
        const scroll = this.scene.cameras.main.scrollX;
        const doorVisible = scroll + GAME_WIDTH >= this.width - 116;
        const progress = this.progress();
        const task = this.spec.tasks.find(([flag]) => !this.hasFlag(flag))?.[1] ?? this.spec.objective;
        this.direction.setText(done ? (doorVisible ? '' : 'Проход открыт →') :
            `${doorVisible ? '🔒 ' : ''}${task}${progress ? ` · ${progress}` : ''}`);
    }

    private drawDoor(x: number, open: boolean): void {
        const g = this.door;
        g.fillStyle(INK).fillRoundedRect(x - 88, 512, 176, 345, 60);
        g.fillStyle(open ? 0x3b6674 : 0x994d64).fillRoundedRect(x - 73, 528, 146, 314, 48);
        if (!open) {
            g.lineStyle(8, 0xb66a79).lineBetween(x, 549, x, 825);
            g.fillStyle(INK).fillRoundedRect(x - 24, 682, 48, 35, 6);
            g.lineStyle(7, INK).strokeCircle(x, 682, 15);
        }
        g.fillStyle(open ? 0x8aebb0 : 0xffac84).fillCircle(x, 569, 17);
    }
}
