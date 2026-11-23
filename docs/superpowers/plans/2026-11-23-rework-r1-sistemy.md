# R1 «Новые системы» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Системы, которых нет в коде, но без которых новые уровни не собрать: диалог-головоломка (повтор раунда при неверном ответе), выбор имени шпица, меню разговоров с персонажами, подсказки через жителей.

**Architecture:** Всё — расширение существующих слоёв: `DialogQueue` (чистая логика) получает повтор раунда; `ScriptRunner` получает два шага (`chooseName`, `openTalk`) через новые методы `ScriptContext`; меню разговоров — чистая логика `src/game/talk/topics.ts` + Vue-компонент `TalkMenu.vue` + данные `public/data/talks.json`. Phaser-сцена только вызывает методы контекста и слушает события шины.

**Tech Stack:** Phaser 4, Vue 3, TypeScript, Vitest.

**Spec:** `docs/SCRIPT.md` (§4.5 выбор имени, §12а разговоры, §8.3 диалог-головоломка Семёна), `docs/INTERACTION_SYSTEM.md` (диалоги), `docs/UI_UX.md`; контракты `00-contracts.md` §5–§7 (обновлены R0).

**Предусловие:** R0 выполнен (ID, `GameStateModel.spitzName`/`talksSeen`, `spitzDisplayName`, `TextBank.setName`).

## Global Constraints

- API Vue/Phaser — после сверки через Context7 (правило `CLAUDE.md`).
- Неверный ответ в диалоге-головоломке **никогда** не блокирует игру и ничего не штрафует.
- Выбор имени — только `ИМЯ_1`/`ИМЯ_2`; «Марат» не выбирается, при клике шпиц говорит `l01.name.marat.locked`, экран остаётся.
- Меню разговоров не меняет сюжет (только шутки и подсказки); каждая тема — существующий диалог из `dialogs.json`.
- Тексты — только ключами; подпись пункта меню — ключ `talk.<персонаж>.<тема>.menu`.
- Коммиты на русском, Conventional Commits, после каждой задачи.

## Review Focus

- Диалог с `retry`: серия из N неверных ответов подряд, затем верный → диалог завершается ровно один раз. Тест в Task 1.
- Выбор имени: повторный вход на экран (загрузка сохранения) не открывает выбор снова и восстанавливает имя. Тест в Task 2.
- Тема `once`: после просмотра исчезает из меню и не возвращается после сохранения/загрузки. Тест в Task 3.
- Тема-подсказка (`hint`) выдаёт следующую ступень и не считается «просмотренной». Тест в Task 5.
- Меню без доступных тем показывает только «Ладно, пока» и не падает. Тест в Task 3.

## Файлы этапа

```
src/game/data/schemas.ts          (DialogChoice.correct, DialogLine.retry, TalkTopic, TalkDef, TalksFile)
src/ui/dialogQueue.ts             (choose с повтором)
src/game/script/types.ts, ScriptRunner.ts   (шаги chooseName, openTalk)
src/game/data/names.ts            (applyNameChoice)
src/game/talk/topics.ts           (availableTopics)
src/ui/NameChoice.vue, TalkMenu.vue, src/ui/uiState.ts (состояние оверлеев)
src/events.ts                     (name:open, talk:open, talk:close, talk:pick)
src/game/scenes/LevelScene.ts     (методы контекста chooseName, openTalk; клик по шпицу)
public/data/talks.json, dialogs.json, texts/ru.json
tests/ui/dialogQueue.test.ts, tests/script/ScriptRunner.test.ts, tests/data/names.test.ts,
tests/talk/topics.test.ts, tests/data/talks.test.ts
```

---

### Task 1: Диалог-головоломка — повтор раунда

**Files:**
- Modify: `src/game/data/schemas.ts`, `src/ui/dialogQueue.ts`, `src/ui/DialogBox.vue` (только передача флагов, если нужна)
- Test: `tests/ui/dialogQueue.test.ts`

**Interfaces:**
- Produces:

```ts
// schemas.ts
export interface DialogChoice { key: string; reply?: { speaker: SpeakerId; key: string }; correct?: boolean }
export interface DialogLine   { speaker: SpeakerId; key: string; choices?: DialogChoice[]; retry?: boolean }
// DialogQueueLine: те же поля (+ retry?: boolean)
// DialogQueue.choose(c): если line.retry === true и c.correct === false →
//   Ксюша говорит c.key, затем c.reply, затем ТА ЖЕ строка (с вариантами) показывается снова.
//   иначе поведение прежнее (линия → ответ → дальше).
```

- [ ] **Step 1: Failing test** (в `tests/ui/dialogQueue.test.ts`):

```ts
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
test('choices without retry keep the old behaviour', () => { /* choose → реплика Ксюши → дальше, без повтора */ });
```

- [ ] **Step 2: Run:** `npx vitest run tests/ui/dialogQueue.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** в `DialogQueue.choose`: при `retry` и `correct === false` вставить после текущей строки реплику Ксюши, ответ и **копию вопроса с вариантами**; прежняя ветка не меняется. Расширить типы в `schemas.ts`.
- [ ] **Step 4: Run:** `npx vitest run tests/ui` — Expected: PASS (включая прежние тесты очереди).
- [ ] **Step 5: Commit** — `feat: повтор раунда при неверном ответе в диалоге-головоломке`.

---

### Task 2: Выбор имени шпица

**Files:**
- Modify: `src/game/script/types.ts`, `src/game/script/ScriptRunner.ts`, `src/game/data/names.ts`, `src/events.ts`, `src/game/scenes/LevelScene.ts`, `src/ui/uiState.ts`, `src/App.vue`
- Create: `src/ui/NameChoice.vue`
- Test: `tests/data/names.test.ts`, `tests/script/ScriptRunner.test.ts`

**Interfaces:**
- Produces:

```ts
// types.ts: Step += { chooseName: true }
// ScriptContext += chooseName(): Promise<void>      // резолвится после выбора имени
// names.ts
export function applyNameChoice(state: GameStateModel, option: 1 | 2 | 3): 'chosen' | 'locked';
//   1|2 → state.spitzName = option; state.setFlag('L01_NAME_CHOSEN'); 'chosen'
//   3   → ничего не меняет; 'locked'
// events: 'name:open': void; 'name:pick': { option: 1 | 2 | 3 }; 'name:done': { option: 1 | 2 }
```

Поведение: `ScriptRunner` на шаге `chooseName` вызывает `ctx.chooseName()`. `LevelScene.chooseName()` эмитит `name:open`, ждёт `name:done`, вызывает `texts.setName('spitz', spitzDisplayName(state.spitzName, texts dict))`. `NameChoice.vue` показывает три кнопки (`name.option.1`, `name.option.2`, `name.option.3`); на нажатие эмитит `name:pick`; обработчик `applyNameChoice`: `'locked'` → шпиц говорит `l01.name.marat.locked` (экран остаётся), `'chosen'` → эмит `name:done`. При загрузке сохранения с `L01_NAME_CHOSEN` имя восстанавливается без показа экрана.

- [ ] **Step 1: Failing tests:**

```ts
test('option 3 (Marat) is locked and changes nothing', () => {
  const s = new GameStateModel();
  expect(applyNameChoice(s, 3)).toBe('locked');
  expect(s.spitzName).toBeNull(); expect(s.hasFlag('L01_NAME_CHOSEN')).toBe(false);
});
test('options 1 and 2 are chosen and flagged', () => {
  const s = new GameStateModel();
  expect(applyNameChoice(s, 2)).toBe('chosen');
  expect(s.spitzName).toBe(2); expect(s.hasFlag('L01_NAME_CHOSEN')).toBe(true);
});
test('chooseName step calls the context', async () => { /* ScriptRunner с ctx.chooseName-заглушкой: шаг { chooseName: true } вызывает её один раз и ждёт */ });
```

- [ ] **Step 2: Run:** `npx vitest run tests/data/names.test.ts tests/script` — Expected: FAIL.
- [ ] **Step 3: Implement** `applyNameChoice`, шаг в `ScriptRunner`, метод контекста и события; компонент `NameChoice.vue` (оверлей Vue, как `PauseMenu.vue`; кнопка «Марат» визуально серая, но кликабельна); подключить в `App.vue`.
- [ ] **Step 4: Run:** `npx vitest run` — Expected: PASS; `npm run build` — типы сходятся.
- [ ] **Step 5: Commit** — `feat: выбор имени шпица`.

---

### Task 3: Логика меню разговоров

**Files:**
- Create: `src/game/talk/topics.ts`
- Modify: `src/game/data/schemas.ts`
- Test: `tests/talk/topics.test.ts`

**Interfaces:**
- Produces:

```ts
// schemas.ts
export interface TalkTopic {
  id: string;                 // 'clock' → ключ просмотра `${talkId}.${id}`
  menuKey: string;            // `talk.<talk>.<id>.menu`
  dialog?: string;            // id в dialogs.json (нет у темы-подсказки)
  hint?: true;                // тема «Что делать дальше»: выдаёт ступень подсказки
  once?: true;
  when?: FlagId; unless?: FlagId;
  fromLevel?: LevelId; toLevel?: LevelId;   // включительно, по порядку L01…L08
}
export interface TalkDef { speaker: SpeakerId; topics: TalkTopic[] }
export type TalksFile = Record<string, TalkDef>;
// topics.ts
export function availableTopics(def: TalkDef, talkId: string, state: GameStateModel): TalkTopic[];
//   фильтр: when/unless по флагам, fromLevel/toLevel по state.levelId, once && hasSeenTalk → исключить
export const talkKey = (talkId: string, topicId: string): string => `${talkId}.${topicId}`;
```

- [ ] **Step 1: Failing test** `tests/talk/topics.test.ts`:

```ts
const def: TalkDef = { speaker: 'nika', topics: [
  { id: 'fair', menuKey: 'k1', dialog: 'd1', fromLevel: 'L02', toLevel: 'L02' },
  { id: 'cat', menuKey: 'k2', dialog: 'd2', fromLevel: 'L06', toLevel: 'L07', once: true },
  { id: 'mask', menuKey: 'k3', dialog: 'd3', when: 'L06_LADDER_DRAWN' },
] };
test('filters by level, flag and once', () => {
  const s = new GameStateModel(); s.levelId = 'L06';
  expect(availableTopics(def, 'nika', s).map(t => t.id)).toEqual(['cat']);
  s.setFlag('L06_LADDER_DRAWN');
  expect(availableTopics(def, 'nika', s).map(t => t.id)).toEqual(['cat', 'mask']);
  s.markTalkSeen('nika.cat');
  expect(availableTopics(def, 'nika', s).map(t => t.id)).toEqual(['mask']);
});
test('no topics → empty list (menu shows only «Ладно, пока»)', () => {
  const s = new GameStateModel(); s.levelId = 'L08';
  expect(availableTopics(def, 'nika', s)).toEqual([]);
});
```

- [ ] **Step 2: Run:** `npx vitest run tests/talk` — Expected: FAIL.
- [ ] **Step 3: Implement** `availableTopics` (порядок уровней — `LEVEL_STYLE`-подобная таблица `LEVEL_ORDER` из `types.ts`; если её нет — добавить рядом с `LEVEL_STYLE`).
- [ ] **Step 4: Run:** `npx vitest run tests/talk` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: логика меню разговоров`.

---

### Task 4: Меню разговоров — шаг, UI, клик по шпицу

**Files:**
- Modify: `src/game/script/types.ts`, `src/game/script/ScriptRunner.ts`, `src/events.ts`, `src/game/scenes/LevelScene.ts`, `src/game/data/loadData.ts`, `src/App.vue`
- Create: `src/ui/TalkMenu.vue`
- Test: `tests/script/ScriptRunner.test.ts`

**Interfaces:**
- Produces:

```ts
// Step += { openTalk: string }        // id из talks.json
// ScriptContext += openTalk(talkId: string): Promise<void>   // резолвится при закрытии меню
// events: 'talk:open': { talkId: string }; 'talk:close': void
// loadData.ts: gameData.talks: TalksFile (public/data/talks.json)
```

`TalkMenu.vue`: по `talk:open` читает `talks[talkId]`, показывает `availableTopics(...)` (пункты `data.texts.t(topic.menuKey)`, просмотренные помечены «✓») и последний пункт «Ладно, пока» (`talk.bye`); выбор темы с `dialog` → запускает диалог через существующий механизм (`dialog:start`), по завершении возвращается к меню; `once`-тема отмечается `state.markTalkSeen(talkKey(...))` после просмотра; «Ладно, пока» эмитит `talk:close`. `LevelScene`: метод контекста `openTalk` эмитит `talk:open` и ждёт `talk:close`; клик по спрайту шпица-напарника вызывает `openTalk('spitz')` (если не идёт скрипт/диалог).

- [ ] **Step 1: Failing test** (ScriptRunner): шаг `{ openTalk: 'nika' }` вызывает `ctx.openTalk('nika')` один раз и ждёт его завершения до следующего шага (проверить порядок записей в логе заглушки контекста).
- [ ] **Step 2: Run:** `npx vitest run tests/script` — Expected: FAIL.
- [ ] **Step 3: Implement** шаг, метод контекста, события, `TalkMenu.vue`, загрузку `talks.json` (файл появится в Task 6; до него — пустой объект `{}`), клик по шпицу.
- [ ] **Step 4: Run:** `npx vitest run` и `npm run build` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: меню разговоров с персонажами`.

---

### Task 5: Тема-подсказка

**Files:**
- Modify: `src/ui/TalkMenu.vue`, `src/game/talk/topics.ts`
- Test: `tests/talk/topics.test.ts`

**Interfaces:**
- Produces: `export function topicMarksSeen(t: TalkTopic): boolean` — `true` только если `t.once === true` (темы с `hint` и обычные повторяемые темы просмотренными не отмечаются, но в меню помечаются «✓» только при `once`).
- Поведение UI: выбор темы с `hint` вызывает то же, что кнопка-шпиц (`bus.emit('hint:request')`), и закрывает меню.

- [ ] **Step 1: Failing test:**

```ts
test('hint and plain topics are never marked as seen', () => {
  expect(topicMarksSeen({ id: 'next', menuKey: 'k', hint: true })).toBe(false);
  expect(topicMarksSeen({ id: 'clock', menuKey: 'k', dialog: 'd' })).toBe(false);
  expect(topicMarksSeen({ id: 'hat', menuKey: 'k', dialog: 'd', once: true })).toBe(true);
});
```

- [ ] **Step 2: Run:** `npx vitest run tests/talk` — Expected: FAIL.
- [ ] **Step 3: Implement** `topicMarksSeen`, использовать в `TalkMenu.vue`; обработка `hint` через `bus.emit('hint:request')`.
- [ ] **Step 4: Run:** `npx vitest run tests/talk` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: тема-подсказка в меню разговоров`.

---

### Task 6: Данные разговоров из `SCRIPT.md` §12а

**Files:**
- Create: `public/data/talks.json`
- Modify: `public/data/dialogs.json`, `public/data/texts/ru.json`
- Test: `tests/data/talks.test.ts`

**Interfaces:**
- Produces: персонажи и темы (ID → `fromLevel`/`toLevel`/условия по таблицам §12а):
  - `spitz`: `clock`, `cat` (с L02), `sausage`, `next` (hint), `worlds` (с L04), `snail`, `friends` (с L02), `sveta` (L08), `hat` (L07, `once`, `when: L07_DRAWING_FOUND`);
  - `nika`: `fair` (L02, `when: L02_FINISHED` или после P-02-эквивалента — `when: L02_FAIR_ALIVE`), `cocoa` (L02), `cat` (L06–L07), `sveta` (L06–L07);
  - `lekha`: `order` (L04), `flour` (L04), `cat` (L06–L07), `sveta` (L06–L07), `mask` (L06–L07);
  - `sveta`: `decor`, `time`, `friends` (все L08);
  - `cat`: `clock` (L07, `when: L07_CAT_RECONCILED`).
- Каждая тема — диалог `talk_<персонаж>_<тема>` в `dialogs.json` (строки — реплики из §12а, разбитые по « — », говорящий определяется по префиксу «Ксюша:»/«Шпиц:»…); каждая реплика — ключ `talk.<персонаж>.<тема>.<n>` в `ru.json`; подпись пункта — `talk.<персонаж>.<тема>.menu`; общий ключ `talk.bye` = «Ладно, пока».

- [ ] **Step 1: Failing test** `tests/data/talks.test.ts`:

```ts
test('every topic points to an existing dialog and has a menu text', () => {
  for (const [id, def] of Object.entries(talks)) for (const t of def.topics) {
    expect(ru[t.menuKey], `${id}.${t.id}`).toBeDefined();
    if (!t.hint) expect(dialogs[t.dialog!], `${id}.${t.id}`).toBeDefined();
    else expect(t.dialog).toBeUndefined();
  }
  expect(ru['talk.bye']).toBe('Ладно, пока');
});
test('all talk characters from SCRIPT §12а exist', () => {
  expect(Object.keys(talks).sort()).toEqual(['cat', 'lekha', 'nika', 'spitz', 'sveta']);
});
```

- [ ] **Step 2: Run:** `npx vitest run tests/data/talks.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** — перенести разговоры из `SCRIPT.md` §12а в `talks.json`, `dialogs.json`, `ru.json` (ручной ввод; ключи реплик внести обратно в `SCRIPT.md` таблицами «ключ → текст», чтобы автор правил их там, и прогнать `npm run texts:build`).
- [ ] **Step 4: Run:** `npx vitest run` и `npm run texts:build` — Expected: PASS, отчёт без новых `skipped`.
- [ ] **Step 5: Commit** — `feat: данные разговоров с персонажами`.

---

## Критерии готовности R1

- `npm test`, `npm run build` зелёные.
- В dev-режиме (`npm run dev`) через отладочную панель можно: открыть выбор имени и выбрать `ИМЯ_1`/`ИМЯ_2`, нажать «Марат» (шпиц отвечает), открыть меню разговоров со шпицем, пройти тему и «Ладно, пока».
- Диалог с `retry` проигрывается повтором при неверном ответе (проверяется на тестовом диалоге).
