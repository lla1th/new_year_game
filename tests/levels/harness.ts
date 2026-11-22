import { readFileSync } from 'node:fs';
import { ScriptRunner, type ScriptContext } from '../../src/game/script/ScriptRunner';
import { inspectSteps, itemSteps, useSteps } from '../../src/game/script/selectSteps';
import type { LevelScript, Step } from '../../src/game/script/types';
import { GameStateModel } from '../../src/state/GameStateModel';
import type { ItemId, PuzzleId } from '../../src/game/data/types';
import { parseTiledMap } from '../../src/game/map/parseTiledMap';
import { NavGrid } from '../../src/game/nav/NavGrid';

export const readJson = (p: string) => JSON.parse(readFileSync(new URL(`../../public/${p}`, import.meta.url), 'utf8'));
export const ru: Record<string, string> = readJson('data/texts/ru.json');
export const dialogs: Record<string, unknown[]> = readJson('data/dialogs.json');

/**
 * Runs a level script with a fake ScriptContext (no Phaser), the same step selection as LevelScene.
 * `puzzles` decides what openPuzzle returns (default: solved). goto to the same level switches the screen.
 */
export function harness(level: LevelScript, opts: { puzzles?: Partial<Record<PuzzleId, boolean>> } = {}) {
  const state = new GameStateModel();
  const log: string[] = [];
  let screen = level.firstScreen;
  const ctx: ScriptContext = {
    state,
    say: async (s, k) => { log.push(`say:${s}:${k}`); },
    dialog: async id => { log.push(`dialog:${id}`); },
    anim: async n => { log.push(`anim:${n}`); },
    sfx: n => { log.push(`sfx:${n}`); },
    walkTo: async p => { log.push(`walkTo:${p}`); },
    openPuzzle: async id => { log.push(`puzzle:${id}`); return opts.puzzles?.[id] ?? true; },
    goto: async (l, s) => {
      log.push(`goto:${l}:${s ?? ''}`);
      if (l === level.levelId) screen = s ?? level.firstScreen;
    },
    cutscene: async n => { log.push(`cutscene:${n}`); },
    wait: async () => {},
    checkpoint: () => { log.push('checkpoint'); },
    progress: () => {},
  };
  const runner = new ScriptRunner(ctx);
  const scr = () => level.screens[screen];
  const script = (id: string) => runner.pickScript(scr().hotspots, id);
  return {
    state, log, runner,
    get screen() { return screen; },
    setScreen: (s: string) => { screen = s; },
    enter: async (s?: string) => { if (s) screen = s; await runner.run(scr().onEnter ?? []); },
    click: (id: string) => runner.run(useSteps(level.levelId, id, script(id), state)),
    inspect: (id: string) => runner.run(inspectSteps(level.levelId, id, script(id))),
    use: (id: string, item: ItemId) => runner.run(itemSteps(script(id), item, () => 'common.wrongItem.1')),
    count: (item: ItemId) => state.inventory.filter(i => i === item).length,
  };
}

/** All steps of a level (recursively), for text/dialog consistency checks. */
export function allSteps(level: LevelScript): Step[] {
  const out: Step[] = [];
  const walk = (steps: Step[]) => {
    for (const st of steps) {
      out.push(st);
      if ('onSolved' in st && st.onSolved) walk(st.onSolved);
      if ('ifFlag' in st || 'ifItem' in st) { walk(st.then); walk(st.else ?? []); }
    }
  };
  for (const sc of Object.values(level.screens)) {
    walk(sc.onEnter ?? []);
    for (const h of sc.hotspots) { walk(h.onUse ?? []); walk(h.onInspect ?? []); for (const v of Object.values(h.onItem ?? {})) walk(v ?? []); }
  }
  return out;
}

/** Map checks: scripted hotspots exist, inspect texts exist (or onInspect given), approach/points walkable. */
export function checkLevelData(level: LevelScript, expect: (v: unknown, msg?: string) => { toBe: (x: unknown) => void; toBeDefined: () => void; toContain: (x: unknown) => void }) {
  const lvl = level.levelId.toLowerCase();
  for (const [name, sc] of Object.entries(level.screens)) {
    const map = parseTiledMap(readJson(sc.map));
    const nav = new NavGrid(map.walkable, map.blockers);
    const ids = map.hotspots.map(h => h.id);
    for (const h of sc.hotspots) expect(ids, `${name}:${h.hotspot}`).toContain(h.hotspot);
    for (const id of ids) {
      const scripted = sc.hotspots.filter(h => h.hotspot === id);
      const covered = scripted.length > 0 && scripted.every(h => h.onInspect);
      if (!covered) expect(ru[`${lvl}.${id}.inspect`], `${lvl}.${id}.inspect`).toBeDefined();
      expect(nav.isWalkable(map.hotspots.find(h => h.id === id)!.approach), `${name}:${id} approach`).toBe(true);
    }
    for (const [p, v] of Object.entries(map.points)) {
      if (p.startsWith('spawn') || p.startsWith('spitz')) expect(nav.isWalkable(v), `${name}:${p}`).toBe(true);
    }
  }
  for (const st of allSteps(level)) {
    if ('say' in st) expect(ru[st.key], st.key).toBeDefined();
    if ('dialog' in st) expect(dialogs[st.dialog], st.dialog).toBeDefined();
  }
  for (const g of level.goals) for (const k of g.hintKeys) expect(ru[k], k).toBeDefined();
}
