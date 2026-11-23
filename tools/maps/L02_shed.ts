import { l02Map, spot, sprite } from '../l02common.ts';

/** L02, экран 4 «Сарай-склад»: генератор, бочка с бензином. */
export default {
  file: 'L02_shed',
  spec: l02Map('w1_shed_bg', [
    spot('generator', 780, 220, 380, 380, { x: 960, y: 760 }, 'gear'),
    spot('barrel', 1300, 380, 200, 240, { x: 1400, y: 760 }, 'hand'),
    spot('exit_shed', 80, 300, 120, 300, { x: 190, y: 780 }, 'exit'),
  ], [
    sprite('generator', 960, 600),
    sprite('barrel', 1400, 620),
  ]),
};
