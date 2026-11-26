import type { Scene } from 'phaser';

const INK = 0x392439;
const CREAM = 0xffefc6;

/** Original cartoon silhouettes, drawn at floor level beside the stations. */
export function drawFactoryWorker(scene: Scene, id: string, x: number, y: number): void {
    const g = scene.add.graphics().setPosition(x, y).setDepth(23);
    g.fillStyle(INK, 0.3).fillEllipse(0, 0, 145, 22);
    if (id === 'ginger') {
        g.lineStyle(43, INK).lineBetween(-24, -91, -40, -23).lineBetween(24, -91, 40, -23)
            .lineBetween(-30, -130, -68, -100).lineBetween(30, -130, 72, -152);
        g.lineStyle(29, 0xbf7448).lineBetween(-24, -91, -40, -23).lineBetween(24, -91, 40, -23)
            .lineBetween(-30, -130, -68, -100).lineBetween(30, -130, 72, -152);
        g.fillStyle(INK).fillRoundedRect(-48, -161, 96, 104, 33).fillCircle(0, -186, 51);
        g.fillStyle(0xcd8650).fillRoundedRect(-41, -158, 82, 94, 29).fillCircle(0, -186, 43);
        g.fillStyle(CREAM).fillCircle(-14, -194, 6).fillCircle(14, -194, 6).fillCircle(0, -118, 6).fillCircle(0, -94, 6);
        g.lineStyle(5, CREAM).lineBetween(-12, -173, 12, -173);
    } else if (id === 'klava') {
        g.lineStyle(11, 0xbd7146).lineBetween(-22, -62, -27, -10).lineBetween(16, -62, 23, -10);
        g.fillStyle(INK).fillEllipse(-5, -80, 142, 133).fillCircle(29, -153, 49);
        g.fillStyle(CREAM).fillEllipse(-5, -80, 127, 118).fillCircle(29, -153, 41);
        g.fillStyle(0xffba56).fillTriangle(64, -153, 64, -123, 99, -138);
        g.fillStyle(0xc04765).fillCircle(7, -192, 14).fillCircle(24, -201, 15).fillCircle(43, -191, 14);
        g.fillStyle(0xdca980).fillEllipse(-18, -90, 77, 59);
        g.fillStyle(INK).fillCircle(40, -154, 8);
    } else {
        g.lineStyle(37, INK).lineBetween(-25, -86, -28, -18).lineBetween(25, -86, 28, -18);
        g.lineStyle(25, 0x467e86).lineBetween(-25, -86, -28, -18).lineBetween(25, -86, 28, -18);
        g.fillStyle(INK).fillRoundedRect(-55, -168, 110, 97, 30).fillCircle(0, -194, 47);
        g.fillStyle(0x659d9b).fillRoundedRect(-49, -161, 98, 83, 25);
        g.fillStyle(0xf0b198).fillCircle(0, -190, 37);
        g.fillStyle(0x824654).fillRoundedRect(-42, -230, 80, 34, 14).fillRoundedRect(-48, -213, 24, 64, 9);
        g.fillStyle(INK).fillCircle(-8, -187, 4).fillCircle(14, -187, 4);
        g.lineStyle(5, INK).lineBetween(-5, -169, 12, -169);
        const wrench = scene.add.graphics().setPosition(x + 40, y - 111).setDepth(23);
        wrench.lineStyle(22, INK).lineBetween(0, 0, 36, -26);
        wrench.lineStyle(12, 0xc8d8d4).lineBetween(22, -10, 66, -47);
        wrench.strokeCircle(72, -51, 13);
        scene.tweens.add({ targets: wrench, angle: { from: -11, to: 17 }, duration: 380, yoyo: true, repeat: -1 });
    }
}
