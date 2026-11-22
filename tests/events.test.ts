import { test, expect } from 'vitest';
import { TypedEmitter } from '../src/events';

test('TypedEmitter on / off / emit', () => {
  const e = new TypedEmitter<{ x: number; y: void }>();
  const got: number[] = [];
  const off = e.on('x', v => got.push(v));
  e.emit('x', 1);
  off();
  e.emit('x', 2);
  expect(got).toEqual([1]);
  let ys = 0;
  const fn = () => { ys++; };
  e.on('y', fn);
  e.emit('y');
  e.off('y', fn);
  e.emit('y');
  expect(ys).toBe(1);
});

test('a listener that unsubscribes during emit does not break other listeners', () => {
  const e = new TypedEmitter<{ x: number }>();
  const got: string[] = [];
  const offA = e.on('x', () => { got.push('a'); offA(); });
  e.on('x', () => got.push('b'));
  e.emit('x', 1);
  e.emit('x', 2);
  expect(got).toEqual(['a', 'b', 'b']);
});
