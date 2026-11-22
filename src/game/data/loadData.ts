import { TextBank } from './TextBank';
import type { CharactersFile, DialogsFile, ItemsFile } from './schemas';

export interface GameData { texts: TextBank; items: ItemsFile; characters: CharactersFile; dialogs: DialogsFile }

async function fetchJson<T>(path: string): Promise<T> {
    const url = `${import.meta.env.BASE_URL}data/${path}`;
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`cannot load ${url}: HTTP ${res.status}`);
    return (await res.json()) as T;
}

/** Loads texts and data files from public/data (respects Vite's base URL). */
export async function loadData(): Promise<GameData> {
    const [ru, items, characters, dialogs] = await Promise.all([
        fetchJson<Record<string, string>>('texts/ru.json'),
        fetchJson<ItemsFile>('items.json'),
        fetchJson<CharactersFile>('characters.json'),
        fetchJson<DialogsFile>('dialogs.json'),
    ]);
    return { texts: new TextBank(ru, characters.names), items, characters, dialogs };
}
