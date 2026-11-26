import { describe, test, expect } from 'vitest';
import { L02 } from '../../src/game/levels/L02';
import { HintSystem } from '../../src/game/systems/HintSystem';
import { INVENTORY_SIZE, type ItemId } from '../../src/game/data/types';
import { harness, checkLevelData } from './harness';

type H = ReturnType<typeof harness>;
const start = async (screen: string): Promise<H> => { const h = harness(L02); await h.enter(screen); return h; };

/** What GeneratorScreen does when the player solves P-02 (it takes bulbs / the pump content, sets the flags). */
const solveGenerator = (h: H) => {
  for (const b of ['ITEM_BULB_RED', 'ITEM_BULB_YELLOW', 'ITEM_BULB_BLUE'] as const) h.state.removeItem(b);
  h.state.setFlag('L02_BULBS_PLACED'); h.state.setFlag('L02_FUELED');
};

/** The whole level in the normal order; returns the harness at the end. */
async function playThrough(): Promise<H> {
  const h = harness(L02);
  h.state.addItem('ITEM_MANDARIN');                       // carried from L01
  await h.enter('gate');
  await h.click('urn'); await h.use('crate', 'ITEM_FOIL');
  await h.use('gate', 'ITEM_GATE_KEY'); await h.click('gate');
  h.setScreen('entrance');
  await h.click('vendor'); await h.click('lantern');
  h.setScreen('square'); await h.click('tent');
  h.setScreen('tent'); await h.enter('tent');            // the cat scene
  h.setScreen('entrance'); await h.click('booth');
  h.setScreen('square');
  await h.click('snowman'); await h.click('carousel'); await h.click('bulb_blue'); await h.click('snowdrift');
  await h.use('shed_door', 'ITEM_SHED_KEY'); await h.click('shed_door');
  h.setScreen('shed');
  await h.use('barrel', 'ITEM_PUMP');
  solveGenerator(h);
  h.state.clearFlag('L02_PUMP_FILLED');
  await h.click('generator');
  return h;
}

describe('L02 «Ярмарка»', () => {
  test('1. foil → crate → key → gate opens and leads on', async () => {
    const h = await start('gate');
    expect(h.log).toContain('dialog:l02_arrive');
    await h.click('urn');
    expect(h.state.hasItem('ITEM_FOIL')).toBe(true);
    await h.use('crate', 'ITEM_FOIL');
    expect(h.state.hasItem('ITEM_FOIL')).toBe(false);
    expect(h.state.hasItem('ITEM_GATE_KEY')).toBe(true);
    h.log.length = 0;
    await h.click('gate');                                   // locked: only a line, no goto
    expect(h.log.some(l => l.startsWith('goto'))).toBe(false);
    await h.use('gate', 'ITEM_GATE_KEY');
    expect(h.state.hasFlag('L02_GATE_OPEN')).toBe(true);
    expect(h.state.hasItem('ITEM_GATE_KEY')).toBe(false);
    h.log.length = 0;
    await h.click('gate');
    expect(h.log).toEqual(['goto:L02:entrance']);
  });

  test('the visible lock accepts the key and the opened passage is clickable at floor level', async () => {
    const h = await start('gate');
    h.state.addItem('ITEM_GATE_KEY');
    await h.use('chain', 'ITEM_GATE_KEY');
    expect(h.state.hasFlag('L02_GATE_OPEN')).toBe(true);
    expect(h.state.hasItem('ITEM_GATE_KEY')).toBe(false);
    h.log.length = 0;
    await h.click('chain');
    expect(h.log).toEqual(['goto:L02:entrance']);
  });

  test('2. the monkey refuses a mandarin; the item stays; the urn gives one foil only', async () => {
    const h = await start('gate');
    h.state.addItem('ITEM_MANDARIN');
    h.log.length = 0;
    await h.use('pole', 'ITEM_MANDARIN');
    expect(h.log).toEqual(['say:monkey:l02.monkey.refuse']);
    expect(h.state.hasItem('ITEM_MANDARIN')).toBe(true);
    await h.click('urn'); h.state.removeItem('ITEM_FOIL');   // spent at the crate
    await h.click('urn');
    expect(h.state.hasItem('ITEM_FOIL')).toBe(false);
  });

  test('3. the vendor is silent until the generator works, then the shooting gallery opens', async () => {
    const h = await start('entrance');
    await h.click('vendor');
    expect(h.log).toEqual(['say:ksyusha:l02.vendor.silent.1']);
    await h.click('lantern');
    h.log.length = 0;
    await h.click('vendor');
    expect(h.log).toEqual(['say:spitz:l02.vendor.silent.2']);
    h.state.setFlag('L02_FAIR_ALIVE');
    h.log.length = 0;
    await h.click('vendor');
    expect(h.log).toEqual(['dialog:l02_vendor', 'say:spitz:l02.spitz.crossout', 'puzzle:S-02b', 'checkpoint']);
    expect(h.state.hasFlag('L02_GALLERY_WON')).toBe(true);
    h.log.length = 0;
    await h.click('vendor');                                 // second time: no intro again
    expect(h.log).toEqual(['puzzle:S-02b', 'checkpoint']);
  });

  test('3b. a lost gallery game gives nothing and can be repeated', async () => {
    const h = harness(L02, { puzzles: { 'S-02b': false } });
    await h.enter('entrance');
    h.state.setFlag('L02_FAIR_ALIVE');
    await h.click('vendor'); await h.click('vendor');
    expect(h.state.hasFlag('L02_GALLERY_WON')).toBe(false);
  });

  test('4. the generator chain: reward flags and the cutscene only after the puzzle is solved', async () => {
    const h = await start('shed');
    solveGenerator(h);
    h.log.length = 0;
    await h.click('generator');
    expect(h.state.hasFlag('L02_GENERATOR_ON')).toBe(true);
    expect(h.state.hasFlag('L02_FAIR_ALIVE')).toBe(true);
    expect(h.log).toEqual(['puzzle:P-02', 'dialog:l02_generator_on', 'checkpoint']);
    const closed = harness(L02, { puzzles: { 'P-02': false } });
    await closed.enter('shed');
    await closed.click('generator');
    expect(closed.state.hasFlag('L02_GENERATOR_ON')).toBe(false);
    expect(closed.state.hasFlag('L02_FAIR_ALIVE')).toBe(false);
  });

  test('5. the pump: barrel fills it, a second pour does not stack, the full tank is only a line', async () => {
    const h = await start('shed');
    h.state.addItem('ITEM_PUMP');
    await h.use('barrel', 'ITEM_PUMP');
    expect(h.state.hasFlag('L02_PUMP_FILLED')).toBe(true);
    expect(h.state.hasItem('ITEM_PUMP')).toBe(true);        // the pump is never spent
    h.state.clearFlag('L02_PUMP_FILLED'); h.state.setFlag('L02_FUELED');
    h.log.length = 0;
    await h.use('barrel', 'ITEM_PUMP');
    expect(h.log).toEqual(['say:ksyusha:l02.barrel.full']);
    expect(h.state.hasFlag('L02_PUMP_FILLED')).toBe(false);
  });

  test('6. the booth: no key before the cat scene, the key once after it', async () => {
    const h = await start('entrance');
    await h.click('booth');
    expect(h.state.hasItem('ITEM_SHED_KEY')).toBe(false);
    expect(h.state.hasFlag('L02_SHED_KEY_TAKEN')).toBe(false);
    h.state.setFlag('L02_CAT_SCENE_DONE');
    await h.click('booth');
    expect(h.state.hasItem('ITEM_SHED_KEY')).toBe(true);
    h.state.removeItem('ITEM_SHED_KEY');
    await h.click('booth');
    expect(h.state.hasItem('ITEM_SHED_KEY')).toBe(false);
  });

  test('6b. the shed needs the key', async () => {
    const h = await start('square');
    await h.click('shed_door');
    expect(h.log.some(l => l.startsWith('goto'))).toBe(false);
    h.state.addItem('ITEM_SHED_KEY');
    await h.use('shed_door', 'ITEM_SHED_KEY');
    expect(h.state.hasFlag('L02_SHED_OPEN')).toBe(true);
    expect(h.state.hasItem('ITEM_SHED_KEY')).toBe(false);
    h.log.length = 0;
    await h.click('shed_door');
    expect(h.log).toEqual(['goto:L02:shed']);
  });

  test('7. Nika: the final talk gives the cocoa; a stroll hint only if the gallery was not won; the teleporter waits', async () => {
    const h = await start('tent');
    h.log.length = 0;
    await h.click('nika');                                   // still frozen: only the inspect line
    expect(h.log).toEqual(['say:ksyusha:l02.nika.inspect']);
    await h.click('teleporter');
    expect(h.log.some(l => l.startsWith('goto'))).toBe(false);
    h.state.setFlag('L02_FAIR_ALIVE');
    h.log.length = 0;
    await h.click('nika');
    expect(h.log).toEqual(['dialog:l02_nika', 'say:nika:l02.nika.stroll', 'checkpoint']);
    expect(h.state.hasItem('ITEM_COCOA')).toBe(true);
    expect(h.state.hasFlag('L02_FINISHED')).toBe(true);
    h.log.length = 0;
    await h.click('teleporter');
    expect(h.log).toContain('goto:L03:');
    const won = await start('tent');
    won.state.setFlag('L02_FAIR_ALIVE'); won.state.setFlag('L02_GALLERY_WON');
    won.log.length = 0;
    await won.click('nika');
    expect(won.log).not.toContain('say:nika:l02.nika.stroll');
  });

  test('8. the inventory never needs a 7th slot, whatever the order of collecting', async () => {
    const peak = ['ITEM_MANDARIN', 'ITEM_BULB_RED', 'ITEM_BULB_YELLOW', 'ITEM_BULB_BLUE', 'ITEM_PUMP', 'ITEM_SHED_KEY'] as ItemId[];
    expect(peak).toHaveLength(INVENTORY_SIZE);
    const orders = [peak, [...peak].reverse(), [peak[3], peak[5], peak[0], peak[2], peak[4], peak[1]]];
    for (const order of orders) {
      const h = harness(L02);
      for (const item of order) expect(h.state.addItem(item), item).toBe(true);
    }
    // and the real walk-through never goes above six at any moment
    const h = harness(L02);
    let max = 0;
    const origAdd = h.state.addItem.bind(h.state);
    h.state.addItem = (i: ItemId) => { const r = origAdd(i); max = Math.max(max, h.state.inventory.length); return r; };
    h.state.addItem('ITEM_MANDARIN');
    await h.enter('gate');
    await h.click('urn'); await h.use('crate', 'ITEM_FOIL'); await h.use('gate', 'ITEM_GATE_KEY');
    h.setScreen('entrance'); await h.click('lantern');
    h.state.setFlag('L02_CAT_SCENE_DONE'); await h.click('booth');
    h.setScreen('square'); await h.click('snowman'); await h.click('carousel'); await h.click('bulb_blue'); await h.click('snowdrift');
    expect(max).toBeLessThanOrEqual(INVENTORY_SIZE);
    expect(h.state.inventory).toHaveLength(6);
  });

  test('9. the cat scene runs once: not again when the tent is entered after the flag', async () => {
    const h = await start('tent');
    expect(h.log).toEqual(['dialog:l02_cat_a', 'anim:cat_jump', 'dialog:l02_cat_b', 'say:spitz:l02.cat.scene.hint', 'checkpoint']);
    expect(h.state.hasFlag('L02_CAT_SCENE_DONE')).toBe(true);
    h.log.length = 0;
    await h.enter('tent');
    expect(h.log).toEqual([]);
  });

  test('10. goals go in order and end with Nika', async () => {
    const h = harness(L02);
    const hints = new HintSystem(L02.goals, f => h.state.hasFlag(f), () => 0);
    const order: [string, string][] = [
      ['L02_GATE_OPEN', 'hint.S-02a.1'], ['L02_CAT_SCENE_DONE', 'hint.l02.tent'], ['L02_SHED_KEY_TAKEN', 'hint.l02.key'],
      ['L02_SHED_OPEN', 'hint.l02.shed'], ['L02_GENERATOR_ON', 'hint.P-02.1'], ['L02_FINISHED', 'hint.l02.nika'],
    ];
    for (const [flag, hint] of order) {
      expect(hints.currentGoal()?.flag).toBe(flag);
      expect(hints.nextHint()).toBe(hint);
      h.state.setFlag(flag as never);
      hints.notifyProgress();
    }
    expect(hints.currentGoal()).toBeNull();
  });

  test('the whole level in the normal order ends at the teleporter', async () => {
    const h = await playThrough();
    expect(h.state.hasFlag('L02_GENERATOR_ON')).toBe(true);
    expect(h.state.hasItem('ITEM_PUMP')).toBe(true);
    h.setScreen('tent');
    await h.click('nika'); await h.click('teleporter');
    expect(h.log.at(-1)).toBe('goto:L03:');
    expect(h.state.hasItem('ITEM_COCOA')).toBe(true);
  });

  test('data: hotspots exist on the maps, every text and dialog exists, points are walkable', () => {
    checkLevelData(L02, expect as never);
  });
});
