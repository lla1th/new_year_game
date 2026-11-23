import { describe, test, expect, vi } from 'vitest';
import { TextBank } from '../../src/game/data/TextBank';

describe('TextBank', () => {
  const tb = new TextBank({ 'a': 'Привет, {name.spitz}!', 'w.1': 'Не, не то', 'w.2': 'Гениально, но нет', 'one.1': 'единственный' }, { spitz: 'Шпиц' });

  test('substitutes names', () => {
    expect(tb.t('a')).toBe('Привет, Шпиц!');
  });
  test('missing key → ⟨key⟩ and a console warning, game continues', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(tb.t('nope')).toBe('⟨nope⟩');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
  test('unknown name placeholder is left as is', () => {
    const t2 = new TextBank({ b: '{name.cat} и {name.zzz}' }, { cat: 'Кошечка' });
    expect(t2.t('b')).toBe('Кошечка и {name.zzz}');
  });
  test('randomVariant', () => {
    expect(tb.randomVariant('w', () => 0).key).toBe('w.1');
    expect(tb.randomVariant('w', () => 0, 'w.1').key).toBe('w.2');
    expect(tb.randomVariant('w', () => 0.99).key).toBe('w.2');
    expect(tb.randomVariant('w', () => 0.99, 'w.2')).toEqual({ key: 'w.1', text: 'Не, не то' });
    expect(tb.randomVariant('one', () => 0, 'one.1').key).toBe('one.1');   // N = 1 → avoid ignored
  });
  test('randomVariant with no variants → ⟨prefix.1⟩', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(tb.randomVariant('none').text).toBe('⟨none.1⟩');
    warn.mockRestore();
  });
});
