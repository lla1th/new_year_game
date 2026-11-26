import { l02Map, spot, sprite } from '../l02common.ts';

/** L02, экран 1 «Перед воротами»: ворота с цепью, столб с обезьянкой, урна, ящик «Обмен», афиша. */
export default {
  file: 'L02_gate',
  spec: l02Map('w1_gate_bg', [
    spot('gate', 1520, 200, 280, 200, { x: 1560, y: 720 }, 'exit'),
    spot('chain', 1520, 400, 280, 220, { x: 1560, y: 740 }, 'hand'),
    spot('pole', 700, 160, 160, 460, { x: 780, y: 720 }, 'hand'),
    spot('crate', 940, 500, 200, 140, { x: 1040, y: 740 }, 'hand'),
    spot('urn', 300, 460, 140, 180, { x: 380, y: 740 }, 'hand'),
    spot('poster', 480, 200, 160, 200, { x: 560, y: 720 }),
  ], [
    sprite('gate_bars', 1660, 620),
    { ...sprite('monkey', 788, 540), texture: 'l02_monkey_climb' },
    sprite('monkey_key', 820, 521, 542),
    sprite('foil', 376, 490),
  ], {
    marker_gate: { x: 1776, y: 330 }, marker_chain: { x: 1705, y: 487 },
    marker_pole: { x: 735, y: 246 }, marker_crate: { x: 1085, y: 546 },
    marker_urn: { x: 423, y: 470 }, marker_poster: { x: 613, y: 245 },
  }),
};
