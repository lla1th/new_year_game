import { describe, test, expect } from 'vitest';
import { ScriptRunner, type ScriptContext } from '../../src/game/script/ScriptRunner';
import type { HotspotScript } from '../../src/game/script/types';
import { GameStateModel } from '../../src/state/GameStateModel';

function fakeCtx() {
  const log: string[] = [];
  let release: (() => void) | null = null;
  const ctx: ScriptContext & { log: string[] } = {
    log,
    state: new GameStateModel(),
    say: async (s, k) => { log.push(`say:${s}:${k}`); },
    dialog: async id => { log.push(`dialog:${id}`); },
    anim: name => new Promise<void>(res => { log.push(`anim:${name}:start`); release = () => { log.push(`anim:${name}:end`); res(); }; }),
    sfx: name => { log.push(`sfx:${name}`); },
    walkTo: async p => { log.push(`walkTo:${p}`); },
    openPuzzle: async id => { log.push(`puzzle:${id}`); return true; },
    goto: async (l, s) => { log.push(`goto:${l}:${s ?? ''}`); },
    cutscene: async n => { log.push(`cutscene:${n}`); },
    wait: async ms => { log.push(`wait:${ms}`); },
    checkpoint: () => { log.push('checkpoint'); },
    progress: () => { log.push('progress'); },
  };
  return { ctx, log, releaseAnim: () => release?.() };
}

describe('ScriptRunner', () => {
  test('runs steps; state steps report progress', async () => {
    const { ctx, log } = fakeCtx();
    const runner = new ScriptRunner(ctx);
    await runner.run([{ say: 'ksyusha', key: 'a' }, { giveItem: 'ITEM_SAUSAGE' }, { setFlag: 'L01_SPITZ_FREED' }, { removeItem: 'ITEM_SAUSAGE' }]);
    expect(log).toEqual(['say:ksyusha:a', 'progress', 'progress', 'progress']);
    expect(ctx.state.hasFlag('L01_SPITZ_FREED')).toBe(true);
    expect(ctx.state.hasItem('ITEM_SAUSAGE')).toBe(false);
  });

  test('all step kinds are dispatched', async () => {
    const { ctx, log } = fakeCtx();
    const runner = new ScriptRunner(ctx);
    await runner.run([
      { dialog: 'd' }, { givePart: 'PART_GEAR' }, { sfx: 's' }, { walkTo: 'spawn' }, { openPuzzle: 'fridge' },
      { goto: { level: 'L02' } }, { goto: { level: 'L03', screen: 'top' } }, { cutscene: 'c' }, { wait: 5 }, { checkpoint: true },
    ]);
    expect(log).toEqual(['dialog:d', 'progress', 'sfx:s', 'walkTo:spawn', 'puzzle:fridge', 'goto:L02:', 'goto:L03:top', 'cutscene:c', 'wait:5', 'checkpoint']);
    expect(ctx.state.parts).toEqual(['PART_GEAR']);
  });

  test('a step does not start before the previous one has finished', async () => {
    const { ctx, log, releaseAnim } = fakeCtx();
    const runner = new ScriptRunner(ctx);
    const done = runner.run([{ anim: 'x' }, { say: 'spitz', key: 'b' }]);
    await Promise.resolve(); await Promise.resolve();
    expect(log).toEqual(['anim:x:start']);
    releaseAnim();
    await done;
    expect(log).toEqual(['anim:x:start', 'anim:x:end', 'say:spitz:b']);
  });

  test('pickScript honours when / unless', () => {
    const { ctx } = fakeCtx();
    const runner = new ScriptRunner(ctx);
    const list: HotspotScript[] = [{ hotspot: 'terrarium', when: 'L01_PORTAL_OPEN', onUse: [{ goto: { level: 'L02' } }] }, { hotspot: 'terrarium' }];
    expect(runner.pickScript(list, 'terrarium')).toBe(list[1]);
    ctx.state.setFlag('L01_PORTAL_OPEN');
    expect(runner.pickScript(list, 'terrarium')).toBe(list[0]);
    const list2: HotspotScript[] = [{ hotspot: 'sofa', unless: 'L01_SPITZ_FREED' }, { hotspot: 'sofa' }];
    expect(runner.pickScript(list2, 'sofa')).toBe(list2[0]);
    ctx.state.setFlag('L01_SPITZ_FREED');
    expect(runner.pickScript(list2, 'sofa')).toBe(list2[1]);
    expect(runner.pickScript(list2, 'nothing')).toBeUndefined();
  });
});
