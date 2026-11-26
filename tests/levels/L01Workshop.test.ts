import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { animConfigs } from '../../src/game/assets/anims';
import { parseManifest } from '../../src/game/assets/manifest';
import { parseTiledMap } from '../../src/game/map/parseTiledMap';
import { NavGrid } from '../../src/game/nav/NavGrid';
import { L01 } from '../../src/game/levels/L01';
import { startScreen } from '../../src/game/levels/index';
import { HintSystem } from '../../src/game/systems/HintSystem';
import { checkLevelData, harness } from './harness';

const map = parseTiledMap(JSON.parse(readFileSync(new URL('../../public/assets/maps/L01_workshop.json', import.meta.url), 'utf8')));
const nav = new NavGrid(map.walkable, map.blockers);

describe('L01 workshop map', () => {
  test('parses, and has all hotspots of the workshop', () => {
    expect(map.levelId).toBe('L01');
    expect(map.hotspots.map(h => h.id).sort()).toEqual(['bench', 'board', 'clock', 'door', 'pendulum', 'snail', 'tak', 'tik']);
  });
  test('spawn points and every approach point are walkable', () => {
    expect(nav.isWalkable(map.points.spawn)).toBe(true);
    expect(nav.isWalkable(map.points.spitz_spawn)).toBe(true);
    for (const h of map.hotspots) expect(nav.isWalkable(h.approach), h.id).toBe(true);
  });
  test('the workshop sprites use registered animations and each elf can patrol and be reached', () => {
    const manifest = parseManifest(JSON.parse(readFileSync(new URL('../../public/data/assets.json', import.meta.url), 'utf8')));
    const animations = new Set(manifest.entries.flatMap(animConfigs).map(a => a.key));
    for (const sprite of map.sprites) expect(animations.has(sprite.texture), sprite.name).toBe(true);

    for (const name of ['tik', 'tak']) {
      expect(animations.has(`l01b_${name}_walk`)).toBe(true);
      const start = map.sprites.find(s => s.name === name)!.pos;
      const end = map.points[`patrol_${name}`];
      const approach = map.hotspots.find(h => h.id === name)!.approach;
      const steps = Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) / 8);
      expect(steps).toBeGreaterThan(0);
      for (let step = 0; step <= steps; step++) {
        const dx = (end.x - start.x) * step / steps;
        const dy = (end.y - start.y) * step / steps;
        expect(nav.isWalkable({ x: start.x + dx, y: start.y + dy }), name).toBe(true);
        expect(nav.isWalkable({ x: approach.x + dx, y: approach.y + dy }), name).toBe(true);
      }
    }
  });
});

describe('L01 workshop script', () => {
  const inWorkshop = async () => { const h = harness(L01); await h.enter('workshop'); return h; };

  test('the door is closed before the briefing', async () => {
    const h = await inWorkshop();
    await h.click('door');
    expect(h.log).toEqual(['say:ksyusha:l01b.door.inspect']);
    expect(h.log.some(l => l.startsWith('goto'))).toBe(false);
  });

  test('the snail briefing runs once: flag, dialog, one checkpoint; the second click is only a line', async () => {
    const h = await inWorkshop();
    await h.click('snail');
    expect(h.state.hasFlag('L01_BRIEFING_DONE')).toBe(true);
    expect(h.log).toEqual(['dialog:l01b_brief', 'checkpoint']);
    h.log.length = 0;
    await h.click('snail');
    expect(h.log).toEqual(['say:snail:l01b.dlg.16']);
    await h.click('snail');
    expect(h.log.filter(l => l === 'checkpoint' || l.startsWith('dialog'))).toEqual([]);
  });

  test('after the briefing the door leads to L02', async () => {
    const h = await inWorkshop();
    await h.click('snail');
    h.log.length = 0;
    await h.click('door');
    expect(h.log).toEqual(['goto:L02:']);
  });

  test('Tik, Tak and the Pendulum only joke: no flags, items or progress', async () => {
    const h = await inWorkshop();
    for (const id of ['tik', 'tak', 'pendulum']) await h.click(id);
    expect(h.log).toEqual(['say:tik:l01b.tik.talk', 'say:tak:l01b.tak.talk', 'say:pendulum:l01b.pendulum.talk']);
    expect(h.state.flags).toEqual({});
    expect(h.state.inventory).toEqual([]);
  });

  test('inspecting the board, bench and clock does not need the briefing', async () => {
    const h = await inWorkshop();
    for (const id of ['board', 'bench', 'clock']) await h.inspect(id);
    expect(h.log).toEqual(['say:ksyusha:l01b.board.inspect', 'say:ksyusha:l01b.bench.inspect', 'say:ksyusha:l01b.clock.inspect']);
  });

  test('the full path: sausage → intro with the name screen → terrarium → workshop → briefing → L02', async () => {
    const h = harness(L01);
    await h.enter();
    await h.click('fridge');
    await h.use('sofa', 'ITEM_SAUSAGE');
    expect(h.state.hasFlag('L01_PORTAL_OPEN')).toBe(true);
    await h.click('terrarium');
    expect(h.screen).toBe('workshop');
    await h.click('snail');
    await h.click('door');
    expect(h.log.at(-1)).toBe('goto:L02:');
  });

  test('goals go in order: free the spitz → enter the portal → talk to the snail', () => {
    const state = harness(L01).state;
    const hints = new HintSystem(L01.goals, f => state.hasFlag(f), () => 0);
    expect(hints.nextHint()).toBe('hint.P-01.1');
    state.setFlag('L01_SPITZ_FREED'); state.setFlag('L01_PORTAL_OPEN');
    expect(hints.nextHint()).toBe('hint.l01.portal');
    state.setFlag('L01_PORTAL_ENTERED');
    expect(hints.nextHint()).toBe('hint.l01b.1');
  });

  test('both screens: hotspots exist on the maps, every text and dialog exists, points are walkable', () => {
    checkLevelData(L01, expect as never);
  });

  test('a saved workshop screen is restored, an unknown one falls back', () => {
    expect(startScreen('L01', 'workshop')).toBe('workshop');
  });
});
