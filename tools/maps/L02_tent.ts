import { l02Map, spot, sprite } from '../l02common.ts';

/** L02, экран 5 «Внутри шатра»: кошечка, Ника, телепортатор, «дыра в пространстве». */
export default {
  file: 'L02_tent',
  spec: l02Map('w1_tent_bg', [
    spot('nika', 1000, 280, 200, 330, { x: 1100, y: 780 }, 'talk'),
    spot('teleporter', 1360, 220, 320, 400, { x: 1500, y: 780 }, 'gear'),
    spot('exit_tent', 80, 300, 120, 300, { x: 190, y: 780 }, 'exit'),
  ], [
    sprite('nika_ice', 1100, 640),
    sprite('cat', 900, 740),
  ], { cat_start: { x: 900, y: 740 }, cat_hole: { x: 1420, y: 520 } }),
};
