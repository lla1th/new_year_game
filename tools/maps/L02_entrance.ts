import { l02Map, spot, sprite } from '../l02common.ts';

/** L02, экран 2 «Вход / площадь»: замёрзший продавец (потом — хозяин тира), будка с ключами, гуляющие. */
export default {
  file: 'L02_entrance',
  spec: l02Map('w1_entrance_bg', [
    spot('vendor', 600, 300, 200, 340, { x: 700, y: 760 }, 'talk'),
    spot('lantern', 820, 380, 100, 120, { x: 880, y: 760 }, 'hand'),
    spot('booth', 1100, 260, 320, 380, { x: 1260, y: 760 }, 'hand'),
    spot('frozen_walkers', 200, 360, 200, 260, { x: 300, y: 760 }, 'eye', { hiddenIf: 'L02_FAIR_ALIVE' }),
    spot('walkers', 180, 415, 240, 238, { x: 300, y: 736 }, 'eye', { enabledIf: 'L02_FAIR_ALIVE' }),
    spot('exit_gate', 80, 300, 100, 300, { x: 180, y: 780 }, 'exit'),
    spot('exit_right', 1740, 300, 120, 300, { x: 1700, y: 780 }, 'exit'),
  ], [
    sprite('vendor_ice', 700, 700),
    { ...sprite('vendor', 700, 700), texture: 'l02_vendor_idle' },
    sprite('lantern_bulb', 880, 500),
    sprite('booth_key', 1260, 520),
    sprite('frozen_walkers', 300, 640),
    { ...sprite('walkers', 300, 640), texture: 'l02_walkers_idle' },
    { ...sprite('guest_muffs', 1720, 956), texture: 'l02_guest_muffs_walk' },
  ], {
    marker_lantern: { x: 920, y: 416 }, marker_booth: { x: 1347, y: 477 },
    marker_walkers: { x: 398, y: 431 },
    walkers_corner: { x: 450, y: 875 }, walkers_turn: { x: 1410, y: 895 },
    guest_muffs_turn: { x: 1120, y: 967 },
  }),
};
