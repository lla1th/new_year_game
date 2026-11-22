import { describe, test, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { L01 } from '../../src/game/levels/L01';
import { LEVELS } from '../../src/game/levels/index';
import { ScriptRunner, type ScriptContext } from '../../src/game/script/ScriptRunner';
import { inspectSteps, itemSteps, useSteps } from '../../src/game/script/selectSteps';
import type { Step } from '../../src/game/script/types';
import { GameStateModel } from '../../src/state/GameStateModel';
import { parseTiledMap } from '../../src/game/map/parseTiledMap';
import { NavGrid } from '../../src/game/nav/NavGrid';
import type { ItemId } from '../../src/game/data/types';

const readJson = (p: string) => JSON.parse(readFileSync(new URL(`../../public/${p}`, import.meta.url), 'utf8'));
const ru: Record<string, string> = readJson('data/texts/ru.json');
const dialogs: Record<string, unknown[]> = readJson('data/dialogs.json');
const screen = L01.screens[L01.firstScreen];

let state: GameStateModel;
let log: string[];
let runner: ScriptRunner;

beforeEach(() => {
  state = new GameStateModel();
  log = [];
  const ctx: ScriptContext = {
    state,
    say: async (s, k) => { log.push(`say:${s}:${k}`); },
    dialog: async id => { log.push(`dialog:${id}`); },
    anim: async n => { log.push(`anim:${n}`); },
    sfx: n => { log.push(`sfx:${n}`); },
    walkTo: async p => { log.push(`walkTo:${p}`); },
    openPuzzle: async id => {
      log.push(`puzzle:${id}`);
      // the fridge close-up: taking the sausage (what FridgeScreen does)
      if (id === 'fridge' && !state.hasItem('ITEM_SAUSAGE') && !state.hasFlag('L01_SPITZ_FREED')) state.addItem('ITEM_SAUSAGE');
      return false;
    },
    goto: async (l, s) => { log.push(`goto:${l}:${s ?? ''}`); },
    cutscene: async n => { log.push(`cutscene:${n}`); },
    wait: async () => {},
    checkpoint: () => { log.push('checkpoint'); },
    progress: () => {},
  };
  runner = new ScriptRunner(ctx);
});

const script = (id: string) => runner.pickScript(screen.hotspots, id);
const click = (id: string) => runner.run(useSteps('L01', id, script(id), state));
const inspect = (id: string) => runner.run(inspectSteps('L01', id, script(id)));
const use = (id: string, item: ItemId) => runner.run(itemSteps(script(id), item, () => 'common.wrongItem.1'));

describe('L01 / P-01 scenarios', () => {
  test('1. mandarin on the sofa: sneeze, mandarin stays, spitz stays under', async () => {
    state.addItem('ITEM_MANDARIN');
    await use('sofa', 'ITEM_MANDARIN');
    expect(state.hasFlag('L01_SPITZ_FREED')).toBe(false);
    expect(state.hasItem('ITEM_MANDARIN')).toBe(true);
    expect(log).toContain('say:spitz:l01.sofa.mandarin');
    expect(log).toContain('say:ksyusha:l01.sofa.mandarin2');
  });

  test('2. sausage on the sofa: spitz out, sausage gone, dialog, portal open', async () => {
    await click('fridge');
    expect(state.hasItem('ITEM_SAUSAGE')).toBe(true);
    await use('sofa', 'ITEM_SAUSAGE');
    expect(state.hasFlag('L01_SPITZ_FREED')).toBe(true);
    expect(state.hasFlag('L01_PORTAL_OPEN')).toBe(true);
    expect(state.hasItem('ITEM_SAUSAGE')).toBe(false);
    expect(log).toContain('dialog:l01_intro');
    expect(log.indexOf('anim:spitz_out')).toBeLessThan(log.indexOf('dialog:l01_intro'));
  });

  test('3. mandarin, then sausage: success', async () => {
    await click('table');
    await use('sofa', 'ITEM_MANDARIN');
    await click('fridge');
    await use('sofa', 'ITEM_SAUSAGE');
    expect(state.hasFlag('L01_PORTAL_OPEN')).toBe(true);
    expect(state.hasItem('ITEM_MANDARIN')).toBe(true);
  });

  test('4. clicking the sofa without an item', async () => {
    await click('sofa');
    expect(log).toEqual(['say:ksyusha:l01.sofa.use']);
  });

  test('5. table twice: one mandarin, the second click is only the inspect text', async () => {
    await click('table');
    log.length = 0;
    await click('table');
    expect(state.inventory.filter(i => i === 'ITEM_MANDARIN')).toHaveLength(1);
    expect(log).toEqual(['say:ksyusha:l01.table.inspect']);
  });

  test('other items on the sofa → wrong-item line', async () => {
    await use('sofa', 'ITEM_COCOA');
    expect(log).toEqual(['say:ksyusha:common.wrongItem.1']);
  });

  test('fridge again after the sausage was used: empty shelf, no second sausage', async () => {
    await click('fridge');
    await use('sofa', 'ITEM_SAUSAGE');
    await click('fridge');
    expect(state.hasItem('ITEM_SAUSAGE')).toBe(false);
  });

  test('terrarium before / after the portal', async () => {
    await click('terrarium');
    expect(log).toEqual(['say:ksyusha:l01.terrarium.inspect']);
    expect(log.some(l => l.startsWith('goto'))).toBe(false);
    state.setFlag('L01_PORTAL_OPEN');
    log.length = 0;
    await click('terrarium');
    expect(log).toEqual(['anim:portal', 'goto:L02:']);
    expect(state.hasFlag('L01_PORTAL_ENTERED')).toBe(true);
  });

  test('after freeing, the sofa only has its new inspect text', async () => {
    state.setFlag('L01_SPITZ_FREED');
    await click('sofa');
    expect(log).toEqual(['say:ksyusha:l01.sofa.freed.inspect']);
  });

  test('mandarin is carried to L02 (inventory is not touched by goto)', async () => {
    await click('table');
    state.setFlag('L01_PORTAL_OPEN');
    await click('terrarium');
    expect(state.hasItem('ITEM_MANDARIN')).toBe(true);
  });

  test('inspect of hotspots without script', async () => {
    await inspect('wall_clock');
    expect(log).toEqual(['say:ksyusha:l01.wall_clock.inspect']);
  });
});

test('portal hint is the current goal after the dialog, until the portal is entered', async () => {
  const { HintSystem } = await import('../../src/game/systems/HintSystem');
  const h = new HintSystem(L01.goals, f => state.hasFlag(f), () => 0);
  state.setFlag('L01_SPITZ_FREED');
  state.setFlag('L01_PORTAL_OPEN');
  h.notifyProgress();
  expect(h.nextHint()).toBe('hint.l01.portal');
  await click('terrarium');
  h.notifyProgress();
  expect(h.currentGoal()).toBeNull();
});

describe('L01 data consistency', () => {
  const map = parseTiledMap(readJson(screen.map));
  const nav = new NavGrid(map.walkable, map.blockers);

  test('every scripted hotspot exists on the map and every map hotspot has an inspect text', () => {
    const ids = map.hotspots.map(h => h.id);
    expect(ids.sort()).toEqual(['fridge', 'sofa', 'table', 'terrarium', 'tree', 'wall_clock', 'window']);
    for (const h of screen.hotspots) expect(ids).toContain(h.hotspot);
    for (const id of ids) expect(ru[`l01.${id}.inspect`], id).toBeDefined();
  });

  test('approach points and named points are walkable', () => {
    for (const h of map.hotspots) expect(nav.isWalkable(h.approach), h.id).toBe(true);
    for (const p of ['spawn', 'spitz_spawn', 'spitz_under_sofa']) expect(nav.isWalkable(map.points[p]), p).toBe(true);
  });

  test('every text key and dialog used by the scripts exists', () => {
    const steps: Step[] = [...(screen.onEnter ?? [])];
    for (const h of screen.hotspots) {
      steps.push(...(h.onUse ?? []), ...(h.onInspect ?? []), ...Object.values(h.onItem ?? {}).flat());
    }
    for (const g of L01.goals) steps.push(...g.hintKeys.map(key => ({ say: 'spitz' as const, key })));
    for (const st of steps) {
      if ('say' in st) expect(ru[st.key], st.key).toBeDefined();
      if ('dialog' in st) expect(dialogs[st.dialog], st.dialog).toBeDefined();
    }
  });

  test('LEVELS has all 8 levels; placeholders load a valid map', () => {
    expect(Object.keys(LEVELS)).toEqual(['L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08']);
    const tbc = parseTiledMap(readJson(LEVELS.L08.screens.tbc.map));
    expect(new NavGrid(tbc.walkable, tbc.blockers).isWalkable(tbc.points.spawn)).toBe(true);
    expect(ru['l02.tbc']).toBeDefined();
  });
});
