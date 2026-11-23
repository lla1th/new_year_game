// Запуск: node --experimental-strip-types tools/build-texts.ts [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { parseScriptTables } from './scriptTexts.ts';

const check = process.argv.includes('--check');
const scriptPath = new URL('../docs/SCRIPT.md', import.meta.url);
const ruPath = new URL('../public/data/texts/ru.json', import.meta.url);

const parsed = parseScriptTables(readFileSync(scriptPath, 'utf8'));
const existing: Record<string, string> = JSON.parse(readFileSync(ruPath, 'utf8'));
const merged = { ...existing, ...parsed.texts };
const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

console.log(`Разобрано ключей: ${Object.keys(parsed.texts).length}`);
console.log(`Незаполненных полей автора (blanks): ${parsed.blanks.length}`);
for (const k of parsed.blanks) console.log(`  - ${k}`);
console.log(`Не разобрано однозначно (skipped): ${parsed.skipped.length}`);
for (const k of parsed.skipped) console.log(`  - ${k}`);

if (check) {
  process.exit(parsed.blanks.length || parsed.skipped.length ? 1 : 0);
} else {
  writeFileSync(ruPath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}
