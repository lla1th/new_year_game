# R0 «Фундамент переработки» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Общая основа для новых уровней: новые ID предметов/флагов/говорящих/головоломок, описания предметов, сохранение v2 с именем шпица, конвейер текстов `SCRIPT.md → ru.json` и генератор карт Tiled.

**Architecture:** Только **добавление**: старые ID остаются (их удаляют планы уровней), поэтому все существующие тесты и игра продолжают работать. Конвейер текстов — чистая функция разбора таблиц Markdown + тонкая обёртка-скрипт. Генератор карт — чистая функция `buildTiledMap(spec)`, результат которой обязан проходить существующий `parseTiledMap`.

**Tech Stack:** TypeScript, Vitest, Node 22 (`node --experimental-strip-types` для скриптов в `tools/`).

**Spec:** `docs/SCRIPT.md` (§1, §2, §3б, §5–§11, §12), `docs/superpowers/plans/2026-11-23-rework-00-obzor.md`; контракты `00-contracts.md` (§1, §4, §6) — правятся в Task 8.

**Предусловие:** M0–M5 выполнены, `npm test` зелёный.

## Global Constraints

- Не удалять и не переименовывать существующие ID и ключи: `ITEM_BULB_GREEN`, `ITEM_BULB_GOLD`, `L02_GARLAND_DONE` и др. остаются до плана L02.
- `FLAG_IDS`, `ALL_ITEM_IDS` — единственные реестры; тесты сверяют их с `items.json`.
- Скрипты в `tools/` не попадают в сборку игры и не импортируются из `src/`.
- Токен имени шпица: в `SCRIPT.md` — `{spitz}`, в игре — `{name.spitz}`; до выбора имени — «Шпиц».
- Коммиты на русском, Conventional Commits, после каждой задачи.

## Review Focus

- Старое сохранение `version: 1` → `loadGame` возвращает `null`, игра не падает. Тест в Task 5.
- Текст с `{spitz}`, когда имя ещё не выбрано, показывает «Шпиц». Тест в Task 6.
- Строка таблицы `SCRIPT.md` с `[ЗАПОЛНИТЬ]` даёт видимую заглушку и попадает в отчёт, а не пропадает молча. Тест в Task 3.
- Строка с двумя репликами разных персонажей в одной ячейке не превращается в один склеенный текст — попадает в `skipped`. Тест в Task 3.
- Карта, сгенерированная из описания, с недостижимой точкой появления отвергается. Тест в Task 4.

## Файлы этапа

```
src/game/data/types.ts                      (изменить: ID)
src/game/data/names.ts                      (создать)
src/game/data/TextBank.ts                   (изменить: setName, {spitz})
src/game/levels/startState.ts               (изменить: таблица)
src/state/GameStateModel.ts, SaveService.ts (изменить: v2)
public/data/items.json, characters.json     (дополнить)
docs/SCRIPT.md                              (§16 «Предметы», дописать)
tools/scriptTexts.ts, build-texts.ts        (создать)
tools/mapSpec.ts, build-maps.ts             (создать)
package.json                                (скрипты texts:build, texts:check, maps:build)
tests/data/types.test.ts, tests/data/names.test.ts, tests/tools/scriptTexts.test.ts, tests/tools/mapSpec.test.ts,
tests/state/GameStateModel.test.ts, tests/state/SaveService.test.ts, tests/levels/startState.test.ts (дополнить)
```

---

### Task 1: Реестр ID

**Files:**
- Modify: `src/game/data/types.ts`
- Test: `tests/data/types.test.ts` (создать)

**Interfaces:**
- Produces (добавить в существующие объединения и массивы, ничего не убирая):

```ts
// ItemId += (16)
'ITEM_BULB_RED' | 'ITEM_BULB_YELLOW' | 'ITEM_FOIL' | 'ITEM_SHED_KEY' | 'ITEM_PUMP' | 'ITEM_PARCEL' | 'ITEM_OILCAN'
| 'ITEM_DUSTER' | 'ITEM_FEATHER' | 'ITEM_POWDER' | 'ITEM_SNOW' | 'ITEM_PEN' | 'ITEM_LETTER_M' | 'ITEM_PENCIL'
| 'ITEM_TINSEL_BALL' | 'ITEM_WIND_KEY'

// FLAG_IDS += (в порядке уровней)
'L01_NAME_CHOSEN','L01_BRIEFING_DONE',
'L02_FOIL_TAKEN','L02_BULB_RED_TAKEN','L02_CAT_SCENE_DONE','L02_SHED_KEY_TAKEN','L02_SHED_OPEN','L02_PUMP_TAKEN',
'L02_BULBS_PLACED','L02_FUELED','L02_GENERATOR_ON','L02_FAIR_ALIVE','L02_GALLERY_WON','L02_FINISHED',
'L03_PARCEL_TAKEN','L03_BELLS_OILED',
'L04_MARMELADYCH_AWAY','L04_TANK_FILLED',
'L05_SEMYON_AGREED','L05_SEMYON_PASSED','L05_STRANGER_SEEN','L05_PEN_HINT',
'L06_PENCIL_TAKEN','L06_LADDER_DRAWN',
'L07_GATE_OPEN',
'L08_OUTFIT_DONE','L08_KEY_TAKEN'

// SpeakerId += (16)
'sveta' | 'vendor' | 'monkey' | 'timofey' | 'grisha' | 'marmeladych' | 'klava' | 'semyon'
| 'cactus' | 'crow' | 'bambah' | 'tik' | 'tak' | 'pendulum' | 'mask' | 'stranger'

// PuzzleId += 'P-09' | 'S-02b'
```

- [ ] **Step 1: Write the failing test** `tests/data/types.test.ts`:

```ts
import { test, expect } from 'vitest';
import { ALL_ITEM_IDS, FLAG_IDS } from '../../src/game/data/types';

test('ID registries have no duplicates', () => {
  expect(new Set(ALL_ITEM_IDS).size).toBe(ALL_ITEM_IDS.length);
  expect(new Set(FLAG_IDS).size).toBe(FLAG_IDS.length);
});
test('new items and flags are registered', () => {
  for (const id of ['ITEM_FOIL', 'ITEM_PUMP', 'ITEM_PENCIL', 'ITEM_WIND_KEY']) expect(ALL_ITEM_IDS).toContain(id);
  for (const f of ['L01_BRIEFING_DONE', 'L02_GENERATOR_ON', 'L05_SEMYON_PASSED', 'L08_OUTFIT_DONE']) expect(FLAG_IDS).toContain(f);
});
test('flag ids follow the level prefix convention', () => {
  for (const f of FLAG_IDS) expect(f).toMatch(/^(L0[1-8]_[A-Z_]+|GAME_COMPLETED)$/);
});
```

- [ ] **Step 2: Run:** `npx vitest run tests/data/types.test.ts` — Expected: FAIL (`ITEM_FOIL` not registered).
- [ ] **Step 3: Implement** — расширить `ItemId`, `ALL_ITEM_IDS`, `FLAG_IDS`, `SpeakerId`, `PuzzleId` в `src/game/data/types.ts` (значения выше; порядок флагов — по уровням).
- [ ] **Step 4: Run:** `npx vitest run tests/data/types.test.ts` — Expected: PASS. Затем `npm run build` — типы сходятся (старые уровни компилируются).
- [ ] **Step 5: Commit** — `feat: добавить новые ID предметов, флагов и персонажей`.

---

### Task 2: Описание предметов и персонажей

**Files:**
- Modify: `docs/SCRIPT.md` (новый §16 «Предметы»), `public/data/items.json`, `public/data/characters.json`
- Test: `tests/data/dataFiles.test.ts` (поправить счётчик/описание теста, остальное не трогать)

**Interfaces:**
- Consumes: `ItemDef` из `src/game/data/schemas.ts`; ключи `item.<ID>.name` / `item.<ID>.inspect`.
- Produces: записи `items.json` (иконка `img/items/<ID>.png`, стиль мира) и `characters.json.names` для новых говорящих.

**Таблица предметов (имя / осмотр / стиль) — внести в `docs/SCRIPT.md` §16 как строки `` `item.ITEM_X.name` | Имя `` и `` `item.ITEM_X.inspect` | «…» ``:**

| ID | Название | Осмотр | Стиль |
|---|---|---|---|
| `ITEM_BULB_RED` | Красная лампочка | «Красная. Светится даже сама по себе.» | w1 |
| `ITEM_BULB_YELLOW` | Жёлтая лампочка | «Золотистая. Нос снеговика был стильным.» | w1 |
| `ITEM_FOIL` | Фольга | «Блестит. Обезьянка будет в восторге.» | w1 |
| `ITEM_SHED_KEY` | Ключ от склада | «Тяжёлый, с биркой „Склад“.» | w1 |
| `ITEM_PUMP` | Топливный насос | «Ручной насос со шлангом. Перекачивает всё, что течёт.» | w1 |
| `ITEM_PARCEL` | Посылка | «„Т. Мышь“. Три года в дороге.» | w1 |
| `ITEM_OILCAN` | Масленка | «Смазывает всё, что скрипит. Кроме характера.» | w1 |
| `ITEM_DUSTER` | Метёлка | «Пыль боится её больше, чем меня.» | w1 |
| `ITEM_FEATHER` | Перо | «Пёрышко Клавы. Щекочет одним видом.» | w2 |
| `ITEM_POWDER` | Сахарная пудра | «Белая, сладкая и летает по воздуху.» | w2 |
| `ITEM_SNOW` | Снег | «Холодная вода. Просто в твёрдом виде.» | w2 |
| `ITEM_PEN` | Ручка | «Ручка, которую искал весь офис.» | w2 |
| `ITEM_LETTER_M` | Буква «М» | «Огромная. Кому-то очень нужна.» | w3 |
| `ITEM_PENCIL` | Карандаш | «Рисует то, что обещает.» | w3 |
| `ITEM_TINSEL_BALL` | Клубок мишуры | «Блестящий. Кошки не устоят.» | fin |
| `ITEM_WIND_KEY` | Заводной ключ | «Ключ от Часов. Маленький, но важный.» | fin |

Имена новых говорящих (`characters.json.names`): sveta «Света», vendor «Продавец», monkey «Обезьянка», timofey «Тимофей», grisha «Гриша», marmeladych «Мармеладыч», klava «Клава», semyon «Семён», cactus «Консьерж», crow «Ворона», bambah «Мистер Бабах», tik «Тик», tak «Так», pendulum «Маятник», mask «Фигура в маске», stranger «Незнакомка». Портреты — не добавлять (заглушки).

- [ ] **Step 1: Failing test** — в `tests/data/dataFiles.test.ts` тест «all items are described» уже сверяет `items.json` с `ALL_ITEM_IDS` (поменять название на «all items are described»); добавить:

```ts
test('every speaker has a name', () => {
  for (const id of ['sveta', 'vendor', 'monkey', 'timofey', 'grisha', 'marmeladych', 'klava', 'semyon', 'cactus', 'crow', 'bambah', 'tik', 'tak', 'pendulum', 'mask', 'stranger'])
    expect(characters.names[id as keyof typeof characters.names], id).toBeDefined();
});
```

- [ ] **Step 2: Run:** `npx vitest run tests/data/dataFiles.test.ts` — Expected: FAIL (нет 16 предметов и имён).
- [ ] **Step 3: Implement** — дописать §16 в `docs/SCRIPT.md` и записи в `items.json`/`characters.json`; ключи текстов появятся в `ru.json` после Task 3 (временно добавить вручную те же ключи, чтобы тест «names and inspect texts exist» проходил, — Task 3 перезапишет их из `SCRIPT.md` теми же значениями).
- [ ] **Step 4: Run:** `npx vitest run tests/data` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: описать новые предметы и персонажей`.

---

### Task 3: Конвейер текстов `SCRIPT.md → ru.json`

**Files:**
- Create: `tools/scriptTexts.ts`, `tools/build-texts.ts`
- Modify: `package.json` (скрипты)
- Test: `tests/tools/scriptTexts.test.ts`

**Interfaces:**
- Produces:

```ts
export interface ParsedTexts {
  texts: Record<string, string>;     // ключ → текст ({spitz} уже заменён на {name.spitz})
  blanks: string[];                  // ключи, чьё значение — поле автора [ЗАПОЛНИТЬ]
  skipped: string[];                 // ключи, которые не удалось разобрать однозначно
}
export function parseScriptTables(markdown: string): ParsedTexts;
```

Правила разбора (строки таблиц Markdown):
- Первая ячейка вида `` `ключ` `` (латиница/цифры/`.`/`_`/`-`, без пробелов) → строка с текстом. Остальные строки пропускаются.
- Текст — первая из оставшихся ячеек, где есть `«`; берётся от первой `«` до **последней** `»` этой ячейки; префикс «Кто:» отбрасывается.
- Если в ячейке более одной пары `«…»`, перед которыми стоят **разные** имена говорящих (`Ксюша: «…» Леха: «…»`) → ключ в `skipped`.
- Если ячеек с `«` нет, а есть `ЗАПОЛНИТЬ` → ключ в `blanks`, значение `⟨заполнить: <ключ>⟩`.
- Строки, где первая ячейка — несколько ключей через запятую или `(…)` — пропускаются.
- `{spitz}` → `{name.spitz}`.

CLI: `npm run texts:build` — читает `docs/SCRIPT.md`, **сливает** результат в `public/data/texts/ru.json` (`{ ...существующее, ...разобранное }`, ключи отсортированы), печатает отчёт (`skipped`, `blanks`). `npm run texts:check` — то же, но ничего не пишет и завершается ненулевым кодом, если `blanks` или `skipped` не пусты.

- [ ] **Step 1: Failing test** `tests/tools/scriptTexts.test.ts`:

```ts
import { test, expect } from 'vitest';
import { parseScriptTables } from '../../tools/scriptTexts';

const md = [
  '| Ключ | Кто | Текст |', '|---|---|---|',
  '| `l01.dlg.intro.1` | Шпиц | «Спасибо! Колбаса — мой любимый вид спасения!» | PROPOSED |',
  '| `l01.dlg.name.4` | Ксюша | «{spitz}. Решено. Хихик.» (после выбора) | НОВОЕ |',
  '| `l02.monkey.name` | Имя обезьянки | **[ЗАПОЛНИТЬ: ________]** |',
  '| `l02.mix` | Ксюша: «А» Леха: «Б» |',
  '| `l04.ginger.talk` | «Не отдам руль!» |',
].join('\n');

test('parses key rows and text', () => {
  const r = parseScriptTables(md);
  expect(r.texts['l01.dlg.intro.1']).toBe('Спасибо! Колбаса — мой любимый вид спасения!');
  expect(r.texts['l01.dlg.name.4']).toBe('{name.spitz}. Решено. Хихик.');
  expect(r.texts['l04.ginger.talk']).toBe('Не отдам руль!');
});
test('blank rows get a visible placeholder and are reported', () => {
  const r = parseScriptTables(md);
  expect(r.blanks).toEqual(['l02.monkey.name']);
  expect(r.texts['l02.monkey.name']).toBe('⟨заполнить: l02.monkey.name⟩');
});
test('two speakers in one cell are skipped, not merged', () => {
  const r = parseScriptTables(md);
  expect(r.skipped).toEqual(['l02.mix']);
  expect(r.texts['l02.mix']).toBeUndefined();
});
```

- [ ] **Step 2: Run:** `npx vitest run tests/tools/scriptTexts.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `parseScriptTables` в `tools/scriptTexts.ts` (разбор по строкам, `split('|')`, без внешних библиотек) и CLI `tools/build-texts.ts` (запуск: `node --experimental-strip-types tools/build-texts.ts [--check]`); добавить в `package.json` `"texts:build"` и `"texts:check"`.
- [ ] **Step 4: Run:** `npx vitest run tests/tools/scriptTexts.test.ts` — Expected: PASS. Затем `npm run texts:build` — Expected: отчёт со списком `skipped`/`blanks`, файл `ru.json` обновлён; `npm test` — Expected: PASS (старые ключи не удалены).
- [ ] **Step 5: Commit** — `feat: добавить конвейер текстов из SCRIPT.md`.

---

### Task 4: Генератор карт Tiled

**Files:**
- Create: `tools/mapSpec.ts`, `tools/build-maps.ts`, `tools/maps/.gitkeep`
- Modify: `package.json` (`"maps:build"`)
- Test: `tests/tools/mapSpec.test.ts`

**Interfaces:**
- Consumes: формат, который читает `parseTiledMap` (`src/game/map/parseTiledMap.ts`, образец — `tests/fixtures/test-map.json` и `public/assets/maps/L05.json`).
- Produces:

```ts
export interface MapSpec {
  levelId: string; background: string; pixelArt: boolean;
  footsteps: 'snow' | 'floor' | 'metal'; music: string;
  walkable: Polygon[]; blockers?: Polygon[];
  hotspots: HotspotDef[];                      // тип из parseTiledMap
  points: Record<string, Vec2>;
  sprites?: SpriteDef[];
}
export function buildTiledMap(spec: MapSpec): Record<string, unknown>;     // готовый Tiled JSON
export const rect: (x: number, y: number, w: number, h: number) => Polygon;
```

`tools/build-maps.ts` импортирует каждую `tools/maps/*.ts` (экспорт `default: { file: string; spec: MapSpec }`) и пишет `public/assets/maps/<file>.json`. Существующие карты **не** перегенерируются, пока их уровень не переработан.

- [ ] **Step 1: Failing test** `tests/tools/mapSpec.test.ts`:

```ts
import { test, expect } from 'vitest';
import { buildTiledMap, rect, type MapSpec } from '../../tools/mapSpec';
import { parseTiledMap } from '../../src/game/map/parseTiledMap';
import { NavGrid } from '../../src/game/nav/NavGrid';

const spec: MapSpec = {
  levelId: 'L02', background: 'w1_gate_bg', pixelArt: true, footsteps: 'snow', music: 'mus_world1',
  walkable: [rect(100, 600, 1700, 300)],
  hotspots: [{ id: 'gate', shape: rect(1500, 400, 200, 300), approach: { x: 1450, y: 700 }, facing: 'dr', cursor: 'hand' }],
  points: { spawn: { x: 300, y: 750 }, spitz: { x: 200, y: 760 } },
};

test('generated map round-trips through parseTiledMap', () => {
  const m = parseTiledMap(buildTiledMap(spec));
  expect(m.levelId).toBe('L02');
  expect(m.hotspots.map(h => h.id)).toEqual(['gate']);
  expect(m.points.spawn).toEqual({ x: 300, y: 750 });
  expect(new NavGrid(m.walkable, m.blockers).isWalkable(m.points.spawn)).toBe(true);
});
test('a spawn point outside the walkable area is rejected', () => {
  expect(() => buildTiledMap({ ...spec, points: { spawn: { x: 5, y: 5 } } })).toThrow(/spawn/);
});
```

- [ ] **Step 2: Run:** `npx vitest run tests/tools/mapSpec.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `buildTiledMap` (слои `walkable`, `blockers`, `hotspots`, `points`, `sprites` и свойства карты — по образцу `L05.json`; точки с префиксом `spawn`/`spitz` проверяются на проходимость через `NavGrid`, иначе `Error` с именем точки) и `rect`; CLI `tools/build-maps.ts`.
- [ ] **Step 4: Run:** `npx vitest run tests/tools/mapSpec.test.ts` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: добавить генератор карт Tiled`.

---

### Task 5: Сохранение v2 и имя шпица в состоянии

**Files:**
- Modify: `src/state/GameStateModel.ts`, `src/state/SaveService.ts`
- Test: `tests/state/GameStateModel.test.ts`, `tests/state/SaveService.test.ts`

**Interfaces:**
- Produces:

```ts
// SaveData: version: 2; + spitzName: 1 | 2 | null; + talksSeen: string[]
// GameStateModel: spitzName: 1 | 2 | null = null; talksSeen: string[] = [];
//   markTalkSeen(id: string): void   // без дублей
//   hasSeenTalk(id: string): boolean
// reset() обнуляет оба поля; toSaveData/loadFrom копируют их.
// loadGame: возвращает null, если version !== 2 (v1 отбрасывается: уровни переделаны)
```

- [ ] **Step 1: Failing tests:**

```ts
test('spitz name and seen talks survive a save round trip', () => {
  const s = new GameStateModel();
  s.spitzName = 2; s.markTalkSeen('spitz.clock'); s.markTalkSeen('spitz.clock');
  const d = s.toSaveData();
  expect(d.version).toBe(2); expect(d.talksSeen).toEqual(['spitz.clock']);
  const t = new GameStateModel(); t.loadFrom(d);
  expect(t.spitzName).toBe(2); expect(t.hasSeenTalk('spitz.clock')).toBe(true);
  t.reset(); expect(t.spitzName).toBeNull(); expect(t.talksSeen).toEqual([]);
});
test('a version 1 save is ignored', () => {
  const store = fakeStorage();   // функция уже есть в начале tests/state/SaveService.test.ts
  store.setItem(SAVE_KEY, JSON.stringify({ version: 1, levelId: 'L03', screenId: null, flags: {}, inventory: [], parts: [], completed: false, savedAt: '' }));
  expect(loadGame(store)).toBeNull();
});
```

- [ ] **Step 2: Run:** `npx vitest run tests/state` — Expected: FAIL.
- [ ] **Step 3: Implement** поля и методы; `version: 2`; `loadGame` принимает только `version === 2` и проверяет форму `spitzName`/`talksSeen` (нет → `null`); поправить существующие тесты на `version: 1`.
- [ ] **Step 4: Run:** `npx vitest run tests/state` и `npm test` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: сохранение v2 с именем шпица и просмотренными разговорами`.

---

### Task 6: Имя шпица в текстах

**Files:**
- Create: `src/game/data/names.ts`
- Modify: `src/game/data/TextBank.ts`
- Test: `tests/data/names.test.ts`, `tests/data/TextBank.test.ts`

**Interfaces:**
- Produces:

```ts
// names.ts
export const DEFAULT_SPITZ_NAME = 'Шпиц';
export function spitzDisplayName(choice: 1 | 2 | null, dict: Record<string, string>): string;
// choice === null → 'Шпиц'; иначе dict[`name.option.${choice}`] ?? 'Шпиц'
// TextBank
setName(id: string, value: string): void;      // меняет names[id]; t() сразу подставляет новое
// t(): подстановка {name.<id>} (как раньше) и алиас {spitz} → {name.spitz}
```

- [ ] **Step 1: Failing tests:**

```ts
test('spitz name falls back to «Шпиц» until chosen', () => {
  const dict = { 'name.option.1': 'Рыжик', 'name.option.2': 'Бублик' };
  expect(spitzDisplayName(null, dict)).toBe('Шпиц');
  expect(spitzDisplayName(2, dict)).toBe('Бублик');
  expect(spitzDisplayName(1, {})).toBe('Шпиц');         // поле автора не заполнено
});
test('TextBank substitutes the chosen name', () => {
  const tb = new TextBank({ a: '{name.spitz} и {spitz}' }, { spitz: 'Шпиц' });
  expect(tb.t('a')).toBe('Шпиц и Шпиц');
  tb.setName('spitz', 'Бублик');
  expect(tb.t('a')).toBe('Бублик и Бублик');
});
```

- [ ] **Step 2: Run:** `npx vitest run tests/data` — Expected: FAIL.
- [ ] **Step 3: Implement** `spitzDisplayName`, `TextBank.setName`, алиас `{spitz}`. Подключение к игре (вызов `setName` при загрузке сохранения и после выбора имени) — в Task R1-2.
- [ ] **Step 4: Run:** `npx vitest run tests/data` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: подстановка имени шпица в текстах`.

---

### Task 7: Стартовые состояния уровней

**Files:**
- Modify: `src/game/levels/startState.ts`
- Test: `tests/levels/startState.test.ts`

**Interfaces:**
- Produces: `TABLE` в `startState.ts` под новый сюжет (функция `startStateFor` не меняется):

| Уровень | inventory | parts |
|---|---|---|
| L01, L02 | — | — |
| L03 | `ITEM_COCOA` | — |
| L04 | — | `PART_SPRING` |
| L05 | `ITEM_MITTENS` | `PART_SPRING` |
| L06 | — | `PART_SPRING`, `PART_GEAR` |
| L07 | `ITEM_PENCIL` | `PART_SPRING`, `PART_GEAR` |
| L08 | — | `PART_SPRING`, `PART_GEAR`, `PART_HANDS` |

Флаги: L02+ — `L01_SPITZ_FREED`, `L01_BRIEFING_DONE`, `L01_NAME_CHOSEN`; дополнительно L03+ — `L02_FINISHED`.

- [ ] **Step 1: Failing test** (дополнить существующий): `startStateFor('L07').inventory` равен `['ITEM_PENCIL']`; `startStateFor('L02').flags` содержит `L01_BRIEFING_DONE` и `L01_NAME_CHOSEN`; `startStateFor('L03').flags.L02_FINISHED === true`; `startStateFor('L01')` по-прежнему `{ inventory: [], parts: [], flags: {} }`.
- [ ] **Step 2: Run:** `npx vitest run tests/levels/startState.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** — обновить `TABLE` и флаги по таблице выше.
- [ ] **Step 4: Run:** `npx vitest run tests/levels` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: стартовые состояния уровней под новый сюжет`.

---

### Task 8: Контракты и README планов

**Files:**
- Modify: `docs/superpowers/plans/00-contracts.md` (§1 — список ID, §4 — `SaveData v2`, §6 — токен `{spitz}`), `docs/superpowers/plans/README.md` (раздел «Переработка 23.11» со ссылкой на `2026-11-23-rework-00-obzor.md`)
- Test: — (документация)

- [ ] **Step 1: Обновить** §1 (новые `ItemId`, флаги, `SpeakerId`, `PuzzleId`), §4 (`version: 2`, `spitzName`, `talksSeen`, правило «v1 отбрасывается»), §6 (`setName`, алиас `{spitz}`).
- [ ] **Step 2: Проверка:** `npm run build && npm test` — Expected: всё зелёное.
- [ ] **Step 3: Commit** — `docs: обновить контракты после этапа R0`.

---

## Критерии готовности R0

- `npm test` и `npm run build` зелёные; игра проходится как раньше (старые уровни не затронуты).
- `npm run texts:build` печатает отчёт, `ru.json` содержит ключи из `SCRIPT.md`.
- `buildTiledMap` генерирует карту, которую читает `parseTiledMap`.
- Старое сохранение v1 не ломает загрузку.
