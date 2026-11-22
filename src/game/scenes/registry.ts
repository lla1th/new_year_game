import type { LevelId } from '../data/types';
import type { LevelScene } from './LevelScene';

/** Named animation used by `{ anim }` steps. Resolves when finished. */
export type SceneAnim = (scene: LevelScene) => Promise<void>;
/** Cutscene used by `{ cutscene }` steps; `skip` resolves when the player skips. Must leave the final state. */
export type SceneCutscene = (scene: LevelScene, skipped: Promise<void>) => Promise<void>;
/** Per-level visual state (e.g. glowing terrarium) refreshed after load and after every progress. */
export type LevelVisual = (scene: LevelScene) => void;

const anims = new Map<string, SceneAnim>();
const cutscenes = new Map<string, SceneCutscene>();
const visuals = new Map<LevelId, LevelVisual>();

export function registerAnim(name: string, fn: SceneAnim): void { anims.set(name, fn); }
export function registerCutscene(name: string, fn: SceneCutscene): void { cutscenes.set(name, fn); }
export function registerLevelVisual(level: LevelId, fn: LevelVisual): void { visuals.set(level, fn); }

export function getAnim(name: string): SceneAnim | undefined { return anims.get(name); }
export function getCutscene(name: string): SceneCutscene | undefined { return cutscenes.get(name); }
export function getLevelVisual(level: LevelId): LevelVisual | undefined { return visuals.get(level); }
