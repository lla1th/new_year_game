import { test, expect } from 'vitest';
import { availableTopics, talkKey } from '../../src/game/talk/topics';
import { GameStateModel } from '../../src/state/GameStateModel';
import type { TalkDef } from '../../src/game/data/schemas';

const def: TalkDef = { speaker: 'nika', topics: [
  { id: 'fair', menuKey: 'k1', dialog: 'd1', fromLevel: 'L02', toLevel: 'L02' },
  { id: 'cat', menuKey: 'k2', dialog: 'd2', fromLevel: 'L06', toLevel: 'L07', once: true },
  { id: 'mask', menuKey: 'k3', dialog: 'd3', when: 'L06_LADDER_DRAWN' },
  { id: 'late', menuKey: 'k4', dialog: 'd4', unless: 'L06_LADDER_DRAWN', fromLevel: 'L06' },
] };

test('filters by level, flag and once', () => {
  const s = new GameStateModel(); s.levelId = 'L06';
  expect(availableTopics(def, 'nika', s).map(t => t.id)).toEqual(['cat', 'late']);
  s.setFlag('L06_LADDER_DRAWN');
  expect(availableTopics(def, 'nika', s).map(t => t.id)).toEqual(['cat', 'mask']);
  s.markTalkSeen('nika.cat');
  expect(availableTopics(def, 'nika', s).map(t => t.id)).toEqual(['mask']);
});
test('a once topic stays hidden after a save / load round trip', () => {
  const s = new GameStateModel(); s.levelId = 'L07'; s.markTalkSeen(talkKey('nika', 'cat'));
  const t = new GameStateModel(); t.loadFrom(s.toSaveData());
  expect(availableTopics(def, 'nika', t).map(x => x.id)).not.toContain('cat');
});
test('no topics → empty list (menu shows only «Ладно, пока»)', () => {
  const s = new GameStateModel(); s.levelId = 'L08';
  const only: TalkDef = { speaker: 'nika', topics: [def.topics[0]] };
  expect(availableTopics(only, 'nika', s)).toEqual([]);
  expect(availableTopics({ speaker: 'nika', topics: [] }, 'nika', s)).toEqual([]);
});
