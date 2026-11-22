import type { Game } from 'phaser';
import type { LevelId } from './data/types';
import { LEVELS } from './levels';
import type { LevelScene } from './scenes/LevelScene';

/** Thin bridge from the Vue UI to the running Phaser game. */
let game: Game | null = null;

export function attachGame (g: Game | null): void {
    game = g;
}

function levelScene (): LevelScene | null {
    return (game?.scene.getScene('LevelScene') as LevelScene | undefined) ?? null;
}

/** Starts (or restarts) LevelScene on the given level/screen. The state must already be set up. */
export function startLevel (level: LevelId, screen?: string | null): void {
    if (!game) return;
    if (game.scene.isActive('OverlayScene')) game.scene.stop('OverlayScene');
    game.scene.start('LevelScene', { script: LEVELS[level], screen: screen ?? undefined });
}

export function stopLevel (): void {
    if (!game) return;
    if (game.scene.isActive('OverlayScene')) game.scene.stop('OverlayScene');
    if (game.scene.isActive('LevelScene') || game.scene.isPaused('LevelScene')) game.scene.stop('LevelScene');
}

export function setPaused (paused: boolean): void {
    if (!game) return;
    for (const key of ['LevelScene', 'OverlayScene']) {
        if (paused && game.scene.isActive(key)) game.scene.pause(key);
        if (!paused && game.scene.isPaused(key)) game.scene.resume(key);
    }
}

/** After the debug panel changed state: re-apply visuals and tell hints. */
export function refreshLevel (): void {
    const s = levelScene();
    s?.hints?.notifyProgress();
    s?.refreshVisuals();
}
