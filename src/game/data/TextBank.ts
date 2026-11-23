/** All player-visible strings come from here (public/data/texts/ru.json). */
export class TextBank {
    private readonly names: Record<string, string>;

    constructor(private readonly dict: Record<string, string>, names: Record<string, string>) {
        this.names = { ...names };
    }

    /** Меняет имя персонажа (например, шпица после выбора); t() сразу подставляет новое. */
    setName(id: string, value: string): void {
        this.names[id] = value;
    }

    /** Substitutes {name.spitz} etc. ({spitz} — алиас {name.spitz}); a missing key shows `⟨key⟩` and warns in the console. */
    t(key: string): string {
        const raw = this.dict[key];
        if (raw === undefined) {
            console.warn(`[TextBank] missing text key "${key}"`);
            return `⟨${key}⟩`;
        }
        return raw.replace(/\{spitz\}/g, '{name.spitz}').replace(/\{name\.(\w+)\}/g, (m, id: string) => this.names[id] ?? m);
    }

    has(key: string): boolean {
        return key in this.dict;
    }

    /** Keys prefix.1 … prefix.N; never returns `avoid` when N > 1. */
    randomVariant(prefix: string, rng: () => number = Math.random, avoid?: string): { key: string; text: string } {
        const keys: string[] = [];
        for (let i = 1; `${prefix}.${i}` in this.dict; i++) keys.push(`${prefix}.${i}`);
        if (keys.length === 0) return { key: `${prefix}.1`, text: this.t(`${prefix}.1`) };
        const pool = keys.length > 1 && avoid !== undefined ? keys.filter(k => k !== avoid) : keys;
        const r = Math.min(0.999999, Math.max(0, rng()));
        const key = pool[Math.floor(r * pool.length)];
        return { key, text: this.t(key) };
    }
}
