import { rect, type MapSpec } from '../mapSpec.ts';

/** L01, экран «Мастерская Улитки» (SCRIPT §4.6). */
const spec: MapSpec = {
  levelId: 'L01', background: 'w1_workshop_bg', pixelArt: true, footsteps: 'floor', music: 'mus_l01',
  walkable: [rect(80, 540, 1760, 460)],
  blockers: [
    rect(240, 540, 360, 90),     // доска проекта (нижний край)
    rect(960, 600, 400, 110),    // верстак
    rect(1480, 540, 260, 90),    // огромный будильник
  ],
  hotspots: [
    { id: 'board', shape: rect(240, 180, 360, 360), approach: { x: 420, y: 700 }, facing: 'ur', cursor: 'eye' },
    { id: 'bench', shape: rect(960, 420, 400, 280), approach: { x: 1160, y: 800 }, facing: 'ur', cursor: 'eye' },
    { id: 'clock', shape: rect(1480, 180, 260, 360), approach: { x: 1610, y: 700 }, facing: 'ur', cursor: 'eye' },
    { id: 'door', shape: rect(1740, 300, 120, 300), approach: { x: 1700, y: 760 }, facing: 'ur', cursor: 'exit' },
    { id: 'snail', shape: rect(1020, 640, 160, 120), approach: { x: 1100, y: 840 }, facing: 'ur', cursor: 'talk' },
    { id: 'tik', shape: rect(1224, 732, 112, 140), approach: { x: 1280, y: 952 }, facing: 'ur', cursor: 'talk' },
    { id: 'tak', shape: rect(1384, 620, 112, 132), approach: { x: 1440, y: 840 }, facing: 'ur', cursor: 'talk' },
    { id: 'pendulum', shape: rect(760, 580, 140, 200), approach: { x: 830, y: 840 }, facing: 'ur', cursor: 'talk' },
  ],
  points: {
    spawn: { x: 600, y: 800 }, spitz_spawn: { x: 520, y: 850 },
    portal: { x: 600, y: 780 },
    marker_tik: { x: 1328, y: 752 }, marker_tak: { x: 1488, y: 632 },
    patrol_tik: { x: 640, y: 880 }, patrol_tak: { x: 1680, y: 810 },
  },
  sprites: [
    { name: 'gears', texture: 'l01b_gears_idle', pos: { x: 122, y: 508 }, depthY: 0 },
    { name: 'lamp', texture: 'l01b_lamp_idle', pos: { x: 1120, y: 396 }, depthY: 0 },
    { name: 'bubbles', texture: 'l01b_bubbles_idle', pos: { x: 1142, y: 516 }, depthY: 0 },
    { name: 'clock_hand', texture: 'l01b_clock_hand_idle', pos: { x: 1600, y: 476 }, depthY: 0 },
    { name: 'snail', texture: 'l01b_snail_idle', pos: { x: 1100, y: 740 }, depthY: 741 },
    { name: 'tik', texture: 'l01b_tik_idle', pos: { x: 1280, y: 852 }, depthY: 853 },
    { name: 'tak', texture: 'l01b_tak_idle', pos: { x: 1440, y: 740 }, depthY: 741 },
    { name: 'pendulum', texture: 'l01b_pendulum_idle', pos: { x: 830, y: 760 }, depthY: 761 },
  ],
};
export default { file: 'L01_workshop', spec };
