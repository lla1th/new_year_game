import type { LevelId, PuzzleId, SpeakerId } from '../data/types';
import type { GameStateModel } from '../../state/GameStateModel';
import type { HotspotScript, Step } from './types';

export interface ScriptContext {
    state: GameStateModel;
    say(speaker: SpeakerId, key: string): Promise<void>;
    dialog(id: string): Promise<void>;
    anim(name: string): Promise<void>;
    sfx(name: string): void;
    walkTo(point: string): Promise<void>;
    openPuzzle(id: PuzzleId): Promise<boolean>;      // true = solved
    goto(level: LevelId, screen?: string): Promise<void>;
    cutscene(name: string): Promise<void>;
    wait(ms: number): Promise<void>;
    checkpoint(): void;
    progress(): void;                                // tell HintSystem about progress
}

export class ScriptRunner {
    constructor(private readonly ctx: ScriptContext) {}

    /**
     * Runs steps one after another; setFlag/giveItem/removeItem/givePart call ctx.progress().
     * `alive` (optional) is checked before every step: once it returns false (scene stopped, level changed)
     * the rest of the script is dropped.
     */
    async run(steps: Step[], alive: () => boolean = () => true): Promise<void> {
        for (const step of steps) {
            if (!alive()) return;
            await this.runStep(step, alive);
        }
    }

    /** First script for `hotspot` whose when/unless conditions match the current flags. */
    pickScript(list: HotspotScript[], hotspot: string): HotspotScript | undefined {
        const s = this.ctx.state;
        return list.find(h => h.hotspot === hotspot
            && (h.when === undefined || s.hasFlag(h.when))
            && (h.unless === undefined || !s.hasFlag(h.unless)));
    }

    private async runStep(step: Step, alive: () => boolean): Promise<void> {
        const c = this.ctx;
        if ('say' in step) return c.say(step.say, step.key);
        if ('dialog' in step) return c.dialog(step.dialog);
        if ('giveItem' in step) { c.state.addItem(step.giveItem); c.progress(); return; }
        if ('removeItem' in step) { c.state.removeItem(step.removeItem); c.progress(); return; }
        if ('givePart' in step) { c.state.addPart(step.givePart); c.progress(); return; }
        if ('removePart' in step) { c.state.removePart(step.removePart); c.progress(); return; }
        if ('setFlag' in step) { c.state.setFlag(step.setFlag); c.progress(); return; }
        if ('anim' in step) return c.anim(step.anim);
        if ('sfx' in step) { c.sfx(step.sfx); return; }
        if ('walkTo' in step) return c.walkTo(step.walkTo);
        if ('openPuzzle' in step) {
            const solved = await c.openPuzzle(step.openPuzzle);
            if (solved && step.onSolved) await this.run(step.onSolved, alive);
            return;
        }
        if ('ifFlag' in step) return this.run(c.state.hasFlag(step.ifFlag) ? step.then : step.else ?? [], alive);
        if ('ifItem' in step) return this.run(c.state.hasItem(step.ifItem) ? step.then : step.else ?? [], alive);
        if ('goto' in step) return c.goto(step.goto.level, step.goto.screen);
        if ('cutscene' in step) return c.cutscene(step.cutscene);
        if ('wait' in step) return c.wait(step.wait);
        if ('checkpoint' in step) { c.checkpoint(); return; }
        const never: never = step;
        throw new Error(`unknown script step ${JSON.stringify(never)}`);
    }
}
