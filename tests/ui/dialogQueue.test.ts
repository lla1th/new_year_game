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

  test('a wrong choice on a retry line shows the same question again', () => {
    const q = new DialogQueue(); let done = 0;
    const line = { speaker: 'semyon' as const, key: 'q1', retry: true, choices: [
      { key: 'wrong', correct: false, reply: { speaker: 'semyon' as const, key: 'r' } },
      { key: 'right', correct: true },
    ] };
    q.enqueue({ lines: [line, { speaker: 'semyon', key: 'end' }], onDone: () => { done++; } });
    q.choose(line.choices[0]);                       // Ксюша: wrong
    q.advance(); q.advance();                        // → ответ Семёна → вопрос снова
    expect(q.line?.key).toBe('q1');
    expect(q.line?.choices?.length).toBe(2);
    q.choose(line.choices[1]); q.advance();          // верный → следующая строка
    expect(q.line?.key).toBe('end');
    q.advance(); expect(done).toBe(1);
  });

  test('a series of wrong answers then a right one ends the dialog exactly once', () => {
    const q = new DialogQueue(); let done = 0;
    const line = { speaker: 'semyon' as const, key: 'q1', retry: true, choices: [
      { key: 'wrong', correct: false, reply: { speaker: 'semyon' as const, key: 'r' } },
      { key: 'right', correct: true },
    ] };
    q.enqueue({ lines: [line], onDone: () => { done++; } });
    for (let i = 0; i < 5; i++) {
      q.choose(q.line!.choices![0]); q.advance(); q.advance();
      expect(q.line?.key).toBe('q1');
      expect(q.line?.choices).toHaveLength(2);
    }
    q.choose(q.line!.choices![1]);
    expect(q.line?.key).toBe('right');
    q.advance();
    expect(done).toBe(1); expect(q.active).toBe(false);
  });

  test('choices without retry keep the old behaviour (a wrong-flagged choice does not repeat)', () => {
    const q = new DialogQueue();
    q.enqueue({ lines: [{ speaker: 'spitz', key: 'q', choices: [{ key: 'c1', correct: false }] }, { speaker: 'spitz', key: 'next' }], onDone: () => {} });
    q.choose(q.line!.choices![0]);
    expect(q.line?.key).toBe('c1');
    q.advance(); expect(q.line?.key).toBe('next');
  });
});

describe('DialogQueue moods', () => {
  test('mood of a choice and of its reply reach the queued lines', () => {
    const q = new DialogQueue();
    q.enqueue({ lines: [{ speaker: 'spitz', key: 'q', mood: 'sad', choices: [{ key: 'c', mood: 'surprised', reply: { speaker: 'spitz', key: 'r', mood: 'happy' } }] }], onDone: () => {} });
    expect(q.line?.mood).toBe('sad');
    q.choose(q.line!.choices![0]);
    expect(q.line).toMatchObject({ speaker: 'ksyusha', key: 'c', mood: 'surprised' });
    q.advance();
    expect(q.line).toMatchObject({ speaker: 'spitz', key: 'r', mood: 'happy' });
  });
});
