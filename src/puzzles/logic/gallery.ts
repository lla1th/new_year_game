/** S-02b «Тир» — pure logic (SCRIPT §5.5). Параметры и таблица — поля автора, см. public/data/gallery.json. */
export type BalloonKind = 'red' | 'gold' | 'black';
export interface GalleryRules { shots: number; points: Record<BalloonKind, number>; fallbackTop: number }
export interface BoardRow { name: string | null; points: number | null }

export const KEEPER_NAME = 'Шпиц-хранитель';
export const BOARD_SIZE = 5;

/** Черновик для теста (SCRIPT §5.5). */
export const DEFAULT_RULES: GalleryRules = { shots: 20, points: { red: 1, gold: 3, black: -2 }, fallbackTop: 20 };

export function scoreHits(hits: BalloonKind[], rules: GalleryRules): number {
    return hits.reduce((sum, k) => sum + rules.points[k], 0);
}

/** Record to beat: the first row's points, or `fallbackTop` while the author has not filled the table. */
export function topScore(board: BoardRow[], rules: GalleryRules): number {
    const p = board[0]?.points;
    return typeof p === 'number' && Number.isFinite(p) ? p : rules.fallbackTop;
}

/** The record must be strictly beaten. */
export function beatsRecord(score: number, board: BoardRow[], rules: GalleryRules): boolean {
    return score > topScore(board, rules);
}

/** The spitz crosses out «Шпиц-хранитель» and writes his chosen name; no choice → the table stays as it is. */
export function boardWithKeeperName(board: BoardRow[], spitzName: string | null): BoardRow[] {
    return board.map(r => (spitzName !== null && r.name === KEEPER_NAME ? { ...r, name: spitzName } : { ...r }));
}

/** Ksyusha writes herself on the first row; the table keeps its length. */
export function boardWithPlayer(board: BoardRow[], playerName: string, score: number): BoardRow[] {
    return [{ name: playerName, points: score }, ...board.map(r => ({ ...r }))].slice(0, BOARD_SIZE);
}

export function displayName(row: BoardRow): string {
    return row.name ? row.name : '—';
}
