import type { Scene } from 'phaser';

/** Deterministic colour (0xRRGGBB) derived from a string key. */
export function colorFromKey(key: string): number {
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    const hue = ((h >>> 0) % 360) / 360;
    // HSL -> RGB with fixed saturation/lightness so labels stay readable
    const s = 0.45;
    const l = 0.55;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const channel = (t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    const r = Math.round(channel(hue + 1 / 3) * 255);
    const g = Math.round(channel(hue) * 255);
    const b = Math.round(channel(hue - 1 / 3) * 255);
    return (r << 16) | (g << 8) | b;
}

/**
 * Returns `key`. If no texture with this key is in the cache, first creates a placeholder:
 * a w×h rectangle coloured from the key with `label` written on it.
 */
const placeholders = new Set<string>();

/** True if `key` is a placeholder drawn by ensureTexture (no real picture was loaded). */
export function isPlaceholder(key: string): boolean {
    return placeholders.has(key);
}

export function ensureTexture(scene: Scene, key: string, w: number, h: number, label: string): string {
    if (scene.textures.exists(key)) return key;
    placeholders.add(key);
    const tex = scene.textures.createCanvas(key, w, h);
    if (!tex) return key;
    const ctx = tex.context;
    const color = colorFromKey(key);
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) / 40));
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);

    const fontSize = Math.max(10, Math.min(48, Math.floor(w / Math.max(4, label.length * 0.6))));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(2, fontSize / 8);
    ctx.strokeText(label, w / 2, h / 2, w - 8);
    ctx.fillText(label, w / 2, h / 2, w - 8);
    tex.refresh();
    return key;
}
