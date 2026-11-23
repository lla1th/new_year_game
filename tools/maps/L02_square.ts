import { l02Map, spot, sprite } from '../l02common.ts';

/** L02, экран 3 «Площадь с шатром»: шатёр, снеговик, карусель, сугроб с насосом, радио, дверь сарая. */
export default {
  file: 'L02_square',
  spec: l02Map('w1_square_fair_bg', [
    spot('tent', 700, 160, 420, 440, { x: 900, y: 760 }, 'exit'),
    spot('snowman', 300, 300, 160, 320, { x: 380, y: 760 }, 'hand'),
    spot('carousel', 1240, 320, 300, 300, { x: 1380, y: 760 }, 'hand'),
    spot('bulb_blue', 1380, 640, 60, 60, { x: 1380, y: 820 }, 'hand', { enabledIf: 'L02_CAROUSEL_SPUN', hiddenIf: 'L02_BULB_BLUE_TAKEN' }),
    spot('snowdrift', 1560, 520, 200, 180, { x: 1620, y: 800 }, 'hand'),
    spot('radio', 520, 520, 100, 100, { x: 560, y: 780 }),
    spot('shed_door', 1700, 220, 140, 280, { x: 1700, y: 740 }, 'exit'),
    spot('exit_left', 80, 300, 100, 300, { x: 180, y: 780 }, 'exit'),
  ], [
    sprite('tent_ice', 910, 600),
    sprite('snowman_nose', 380, 400),
    sprite('snowman_mandarin', 380, 400, 402),
    sprite('bulb_blue', 1380, 700),
    sprite('pump_hose', 1660, 640),
  ]),
};
