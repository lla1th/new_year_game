export interface ParsedTexts {
  texts: Record<string, string>;
  blanks: string[];
  skipped: string[];
}

const KEY_RE = /^`([A-Za-z0-9._-]+)`$/;
const SPEAKER_RE = /(?:^|[\s.!?»(])([А-ЯЁA-Z][\wА-Яа-яёЁ ]{0,30}?):\s*«/g;

export function parseScriptTables(markdown: string): ParsedTexts {
  const texts: Record<string, string> = {};
  const blanks: string[] = [];
  const skipped: string[] = [];

  for (const line of markdown.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length < 2) continue;
    const m = KEY_RE.exec(cells[0]);
    if (!m) continue;
    const key = m[1];
    const rest = cells.slice(1);

    // Пометка автора важнее кавычек внутри неё: «[ЗАПОЛНИТЬ … про «Марат»]» — это поле автора, а не текст.
    const cell = rest.find(c => c.includes('«') && !c.includes('ЗАПОЛНИТЬ'));
    if (cell !== undefined) {
      const speakers = new Set([...cell.matchAll(SPEAKER_RE)].map(s => s[1].trim()));
      const first = cell.indexOf('«');
      const last = cell.lastIndexOf('»');
      if (speakers.size > 1 || last < first) { skipped.push(key); continue; }
      texts[key] = cell.slice(first + 1, last).replace(/\{spitz\}/g, '{name.spitz}');
    } else if (rest.some(c => c.includes('ЗАПОЛНИТЬ'))) {
      if (!blanks.includes(key)) blanks.push(key);
      texts[key] = `⟨заполнить: ${key}⟩`;
    }
  }
  return { texts, blanks, skipped };
}
