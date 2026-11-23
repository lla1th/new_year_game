import { describe, test, expect } from 'vitest';
import { DialogQueue } from '../../src/ui/dialogQueue';

describe('DialogQueue', () => {
  test('jobs run in order; onDone fires when a job ends', () => {
    const q = new DialogQueue();
    const done: string[] = [];
    q.enqueue({ lines: [{ speaker: 'spitz', key: 'a' }, { speaker: 'ksyusha', key: 'b' }], onDone: () => done.push('d1') });
    q.enqueue({ lines: [{ speaker: 'ksyusha', key: 'c' }], onDone: () => done.push('d2') });
    expect(q.line?.key).toBe('a');
    q.advance(); expect(q.line?.key).toBe('b');
    q.advance(); expect(done).toEqual(['d1']); expect(q.line?.key).toBe('c');
    q.advance(); expect(done).toEqual(['d1', 'd2']); expect(q.line).toBeNull(); expect(q.active).toBe(false);
  });

  test('an empty dialog while another job is on screen ends at once and does not drop the current job', () => {
    const q = new DialogQueue();
    const done: string[] = [];
    q.enqueue({ lines: [{ speaker: 'ksyusha', key: 'a' }], onDone: () => done.push('say') });
    q.enqueue({ lines: [], onDone: () => done.push('empty') });
    expect(done).toEqual(['empty']);
    expect(q.line?.key).toBe('a');
    q.advance();
    expect(done).toEqual(['empty', 'say']);
    expect(q.active).toBe(false);
  });

  test('choices: chosen line, reply, then the common next line', () => {
    const q = new DialogQueue();
    q.enqueue({ lines: [{ speaker: 'spitz', key: 'q', choices: [{ key: 'c1', reply: { speaker: 'spitz', key: 'r1' } }] }, { speaker: 'spitz', key: 'next' }], onDone: () => {} });
    q.choose(q.line!.choices![0]);
    expect(q.line?.key).toBe('c1');
    q.advance(); expect(q.line?.key).toBe('r1');
    q.advance(); expect(q.line?.key).toBe('next');
  });
});
