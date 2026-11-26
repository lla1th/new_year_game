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
    sprite('snowman', 379, 560),
    sprite('snowman_nose', 375, 444, 562),
    sprite('snowman_mandarin', 375, 444, 562),
    sprite('bulb_blue', 1410, 700),
    sprite('pump_hose', 1660, 640),
    { ...sprite('square_couple', 410, 890), texture: 'l02_walkers_walk' },
    { ...sprite('guest_balloon', 575, 820), texture: 'l02_guest_balloon_walk' },
    { ...sprite('guest_cocoa', 1585, 955), texture: 'l02_guest_cocoa_walk' },
  ], {
    marker_tent: { x: 975, y: 418 }, marker_snowdrift: { x: 1713, y: 609 },
    marker_shed_door: { x: 1801, y: 368 }, marker_carousel: { x: 1460, y: 479 },
    square_couple_turn: { x: 1430, y: 902 },
    guest_balloon_turn: { x: 1035, y: 832 }, guest_cocoa_turn: { x: 965, y: 962 },
  }),
};
