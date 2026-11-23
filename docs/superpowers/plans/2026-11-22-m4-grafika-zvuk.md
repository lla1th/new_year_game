# M4 «Графика и звук» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подключить реальные ассеты (по мере готовности у автора), сделать чёткий пиксельный мир 1, переход «перерисовка кистью» и звуковую систему с музыкой и эффектами.

**Architecture:** Единый манифест ассетов `public/data/assets.json` связывает логические ключи с файлами; загрузчик берёт только существующие записи, остальное рисует `ensureTexture`. Звук — `AudioManager` поверх звуковой системы Phaser с кроссфейдом и громкостями из настроек. Переход — отдельная `TransitionScene`.

**Tech Stack:** Phaser 4, Vue 3, TypeScript, Vitest.

**Spec:** `docs/ART_BIBLE.md`, `docs/ASSET_REQUIREMENTS.md`, `docs/AUDIO_DESIGN.md`, `docs/TECHNICAL_SPECIFICATION.md` §5, §10–11; контракты `00-contracts.md` §10.

**Предусловие:** M3 выполнен (игра проходится на заглушках).

## Global Constraints

- Правила `CLAUDE.md`: API Phaser 4 (фильтрация текстур, маски/фильтр `Mask`, звук, загрузчик) — **только** после сверки через Context7; места с пометкой «(проверить)» в техспецификации сверить обязательно.
- Мир 1: фоны 480×270, увеличение ×4 **без сглаживания**; остальные миры — со сглаживанием. Сглаживание отключается для текстур мира 1, не глобально.
- Переход «перерисовка кистью» — **2–3 с**, в конце L03, конце L05 и при входе в L08.
- Музыка: кроссфейд **1,5 с**; в паузе — 30 % громкости. Звук стартует только после первого взаимодействия.
- Бюджет: билд ≤ 60 МБ, уровень ≤ 8 МБ, текстура ≤ 2048×2048.
- Иконки предметов — в стиле мира, где предмет найден.
- Фото реальных людей в репозиторий не добавлять.
- Для каждого звука — источник и лицензия в `public/assets/audio/CREDITS.md`.
- Коммиты на русском, Conventional Commits, после каждой задачи.

## Review Focus

- Ассет указан в манифесте, но файла нет (опечатка в пути) — игра не падает, рисуется заглушка, в консоли предупреждение. Тест в Task 1.
- Переход во время которого игрок кликает — клики не проходят в сцену до конца перехода. Проверка в Task 3.
- Громкость 0 у музыки — музыка не играет совсем (а не тихо), смена мира не включает её. Тест в Task 4.
- Быстрая смена уровня (отладочный переход L02 → L06) — старая музыка останавливается, не играют два трека. Тест в Task 4.
- Разметка Tiled не совпадает с новой картинкой (сдвиг на 10–20 px) — проверить на каждом уровне в `?debug=1`. Проверка в Task 2.

## Файлы этапа

```
public/data/assets.json                     — манифест
src/game/assets/manifest.ts                 — типы, разбор, выбор ассетов уровня
src/game/assets/loadLevelAssets.ts          — загрузка в Phaser с фолбэком
src/game/scenes/TransitionScene.ts
src/game/audio/AudioManager.ts, src/game/audio/volume.ts
public/assets/img/**, public/assets/audio/**, public/assets/audio/CREDITS.md
tests/assets/manifest.test.ts, tests/audio/volume.test.ts
```

---

### Task 1: Манифест ассетов с фолбэком на заглушки

**Files:**
- Create: `public/data/assets.json`, `src/game/assets/manifest.ts`, `src/game/assets/loadLevelAssets.ts`
- Modify: сцены, которые сейчас зовут `ensureTexture` напрямую, — брать ключи из манифеста
- Test: `tests/assets/manifest.test.ts`

**Interfaces:**
- Produces:

```ts
export interface AssetEntry { key: string; path: string; kind: 'image' | 'audio'; pixelArt?: boolean; levels: (LevelId | 'common')[] }
export interface Manifest { entries: AssetEntry[] }
export function parseManifest(json: unknown): Manifest;                 // бросает Error на неверную структуру
export function assetsForLevel(m: Manifest, level: LevelId): AssetEntry[];   // свои + 'common'
export function loadLevelAssets(scene: Phaser.Scene, level: LevelId): Promise<{ missing: string[] }>;
// ошибка загрузки файла → ключ в missing + console.warn; далее везде ensureTexture(key)
```

- [x] **Step 1: Тесты**

```ts
const m = parseManifest({ entries: [
  { key:'w1_fair_bg', path:'img/world1/w1_fair_bg.png', kind:'image', pixelArt:true, levels:['L02'] },
  { key:'ui_slot', path:'img/ui/slot.png', kind:'image', levels:['common'] } ] });
expect(assetsForLevel(m,'L02').map(e => e.key).sort()).toEqual(['ui_slot','w1_fair_bg']);
expect(assetsForLevel(m,'L04').map(e => e.key)).toEqual(['ui_slot']);
expect(() => parseManifest({ entries: [{ key: 1 }] })).toThrow();
```

- [x] **Step 2–4:** FAIL → реализовать (`loadLevelAssets` — сверить с Context7 события ошибок загрузчика Phaser 4) → PASS.
- [x] **Step 5: Заполнить манифест** всеми ключами из `ASSET_REQUIREMENTS.md` (пути по соглашению об именах оттуда же). Пока файлов нет — игра на заглушках, как раньше.
- [x] **Step 6: Commit** — `feat: добавить манифест ассетов с фолбэком на заглушки`

---

### Task 2: Подключение графики и пиксельный режим мира 1

**Files:**
- Modify: `public/assets/img/**` (файлы от автора), `public/data/assets.json`, `public/assets/maps/*.json`, `src/game/assets/loadLevelAssets.ts`, `src/ui/*.vue` (портреты, иконки, курсоры)

- [x] **Step 1: Сверить через Context7** способ отключить сглаживание для отдельной текстуры в Phaser 4 (и как увеличивать фон 480×270 до 1920×1080 ×4).
- [x] **Step 2: Пиксельный режим**: для записей `pixelArt: true` — фильтр «ближайший сосед»; фон мира 1 масштабируется ×4; спрайты мира 1 — целочисленный масштаб ×4. Отладочная проверка: скриншот L02 при увеличении — края пикселей резкие.
- [ ] **Step 3: Подключить готовые ассеты** *(ждёт файлов автора: на 22.11.2026 в репозитории их нет; загрузка и пиксельный режим готовы и проверены на временных файлах)* (что есть у автора на момент выполнения): фоны, спрайты персонажей по позам (`dr_idle`, `ur_idle`, `dr_use`, `dr_talk`, `dr_hihik`; левые — зеркало), портреты 256×256 в `DialogBox`, иконки 128×128 в `Inventory`, курсоры 32×32 (CSS `cursor: url(...)` по событию `cursor`), UI-элементы.
- [ ] **Step 4: Подогнать разметку Tiled** *(ждёт файлов автора: на 22.11.2026 в репозитории их нет; загрузка и пиксельный режим готовы и проверены на временных файлах)* под реальные картинки на каждом подключённом уровне: в `?debug=1` полигоны `walkable`/`hotspots` совпадают с нарисованным полом и объектами; Ксюша не заходит в стены, `approach`-точки на полу.
- [ ] **Step 5: Конвертация** *(ждёт файлов автора: на 22.11.2026 в репозитории их нет; загрузка и пиксельный режим готовы и проверены на временных файлах)*: фоны миров 2/3/финала — WebP q85; мир 1 — PNG. Проверить размер билда: `npm run build && du -sh dist` ≤ 60 МБ.
- [x] **Step 6: Commit** — `feat: подключить графику и пиксельный режим мира 1` (повторять коммит по мере поступления ассетов: `feat: подключить графику уровня LXX`)

---

### Task 3: Переход «перерисовка кистью»

**Files:**
- Create: `src/game/scenes/TransitionScene.ts`, `public/assets/img/ui/brush_01…12.png` (маски-мазки; временно — сгенерированные в коде)
- Modify: `src/game/levels/L03.ts`, `L05.ts`, `L08.ts` (заменить затемнение на переход)

**Interfaces:**
- Produces: шаг скрипта `{ cutscene: 'brush:<fromStyle>-><toStyle>' }` или метод `transitionTo(level: LevelId): Promise<void>` в `LevelScene` — длительность 2,5 с, ввод заблокирован до конца.

- [x] **Step 1: Сверить через Context7** фильтр `Mask` Phaser 4 (маска из текстуры/RenderTexture) и снимок кадра в текстуру.
- [x] **Step 2: Реализовать**: снимок старого кадра → загрузить новый уровень под ним → раскрывать новый через маску, в которую 8–12 мазков кисти добавляются по очереди (каждый ≈ 0,2 с) → убрать снимок. Звук `sfx_transition`. Ксюша и шпиц остаются на своих экранных позициях на всё время перехода.
- [x] **Step 3: Запасной вариант** (если маска не заработает за разумное время — сообщить автору): последовательность 8–12 полноэкранных кадров-мазков поверх картинки нового мира.
- [x] **Step 4: Проверка (Playwright MCP):** три точки перехода; клики во время перехода не вызывают ходьбу; длительность 2–3 с.
- [x] **Step 5: Commit** — `feat: добавить переход между мирами «перерисовка кистью»`

---

### Task 4: Звук и музыка

**Files:**
- Create: `src/game/audio/volume.ts`, `src/game/audio/AudioManager.ts`, `public/assets/audio/CREDITS.md`
- Modify: сцены и экраны (вызовы `sfx`), `SettingsPanel.vue`, `PauseMenu.vue`
- Test: `tests/audio/volume.test.ts`

**Interfaces:**
- Produces:

```ts
// volume.ts — чистые функции
export function effectiveVolume(setting0to100: number, paused: boolean, isMusic: boolean): number;  // 0..1; пауза — музыка ×0.3
export function musicForLevel(level: LevelId): 'mus_world1' | 'mus_world2' | 'mus_world3' | 'mus_finale';
// AudioManager
export class AudioManager {
  playMusic(key: string): void;      // кроссфейд 1,5 с; тот же трек — ничего; громкость 0 — не запускать
  playSfx(key: string): void;        // нет файла — тихо пропустить
  setPaused(p: boolean): void;
  applySettings(s: Settings): void;
  unlock(): void;                    // вызывать на первом pointerdown/keydown
}
```

- [x] **Step 1: Тесты**

```ts
expect(effectiveVolume(70, false, true)).toBeCloseTo(0.7);
expect(effectiveVolume(70, true, true)).toBeCloseTo(0.21);
expect(effectiveVolume(80, true, false)).toBeCloseTo(0.8);
expect(effectiveVolume(0, false, true)).toBe(0);
expect(musicForLevel('L01')).toBe('mus_world1'); expect(musicForLevel('L05')).toBe('mus_world2');
expect(musicForLevel('L07')).toBe('mus_world3'); expect(musicForLevel('L08')).toBe('mus_finale');
```

- [x] **Step 2–4:** FAIL → реализовать `volume.ts` → PASS.
- [x] **Step 5: `AudioManager`** (сверить звуковую систему Phaser 4 через Context7, форматы `.ogg` + `.m4a`): музыка по `musicForLevel` и `mus_menu` в меню; в L07 после примирения — `mus_finale`; кроссфейд 1,5 с; при смене уровня — один активный трек; звуки — все ID из `AUDIO_DESIGN.md` §2 в соответствующих местах (шаги по свойству карты `footsteps`, `sfx_typing` раз в 3 символа, `sfx_hihik` вместе с «Хихик»); фоновые `amb_*` тихо, по уровню.
- [x] **Step 6: Файлы**: подключить музыку и звуки, которые есть; для каждого звука строка в `CREDITS.md` (файл — источник — лицензия). Пока файла нет — `playSfx` молча пропускает.
- [x] **Step 7: Проверка (Playwright MCP):** звук не начинается до первого клика; регуляторы громкости работают раздельно и сохраняются; при отладочном переходе L02 → L06 играет только один трек.
- [x] **Step 8: Commit** — `feat: добавить музыку и звуковые эффекты`

---

## Критерии готовности этапа

- Все ассеты из `ASSET_REQUIREMENTS.md`, которые есть у автора, подключены; недостающие — заглушки без падений.
- Пиксельный мир — резкие пиксели; разметка совпадает с картинками.
- Переход-кисть в трёх точках, 2–3 с, ввод заблокирован.
- Музыка по мирам с кроссфейдом, звуки по событиям, `CREDITS.md` заполнен.
- Билд ≤ 60 МБ.
