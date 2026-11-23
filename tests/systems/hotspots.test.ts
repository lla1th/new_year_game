import { describe, test, expect } from 'vitest';
import { hitTestHotspots } from '../../src/game/systems/hotspots';
import type { HotspotDef } from '../../src/game/map/parseTiledMap';

const sofa: HotspotDef = {
  id: 'sofa', shape: [{ x: 760, y: 560 }, { x: 1040, y: 560 }, { x: 1040, y: 680 }, { x: 760, y: 680 }],
  approach: { x: 700, y: 700 }, facing: 'dr', cursor: 'hand',
};
const pillow: HotspotDef = { ...sofa, id: 'pillow', shape: [{ x: 780, y: 580 }, { x: 840, y: 580 }, { x: 840, y: 640 }, { x: 780, y: 640 }] };

describe('hitTestHotspots', () => {
  test('hit / miss / enabledIf', () => {
    expect(hitTestHotspots([sofa], { x: 800, y: 600 }, () => false)?.id).toBe('sofa');
    expect(hitTestHotspots([sofa], { x: 10, y: 10 }, () => false)).toBeNull();
    expect(hitTestHotspots([{ ...sofa, enabledIf: 'L01_SPITZ_FREED' }], { x: 800, y: 600 }, () => false)).toBeNull();
    expect(hitTestHotspots([{ ...sofa, enabledIf: 'L01_SPITZ_FREED' }], { x: 800, y: 600 }, () => true)?.id).toBe('sofa');
  });
  test('hiddenIf', () => {
    expect(hitTestHotspots([{ ...sofa, hiddenIf: 'L01_SPITZ_FREED' }], { x: 800, y: 600 }, () => true)).toBeNull();
    expect(hitTestHotspots([{ ...sofa, hiddenIf: 'L01_SPITZ_FREED' }], { x: 800, y: 600 }, () => false)?.id).toBe('sofa');
  });
  test('the last one in the list wins on overlap; a hidden top one falls through', () => {
    expect(hitTestHotspots([sofa, pillow], { x: 800, y: 600 }, () => false)?.id).toBe('pillow');
    expect(hitTestHotspots([pillow, sofa], { x: 800, y: 600 }, () => false)?.id).toBe('sofa');
    expect(hitTestHotspots([sofa, { ...pillow, hiddenIf: 'L01_SPITZ_FREED' }], { x: 800, y: 600 }, () => true)?.id).toBe('sofa');
  });
});
