import { test, expect } from 'vitest';
import { clientToGame } from '../../src/ui/coords';

test('clientToGame', () => {
  expect(clientToGame(480, 270, { left: 0, top: 0, width: 960, height: 540 })).toEqual({ x: 960, y: 540 });
  expect(clientToGame(100, 70, { left: 100, top: 70, width: 960, height: 540 })).toEqual({ x: 0, y: 0 });
  expect(clientToGame(320 + 1920, 1080, { left: 320, top: 0, width: 1920, height: 1080 })).toEqual({ x: 1920, y: 1080 });
});
