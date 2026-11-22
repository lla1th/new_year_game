import type { FlagId } from '../data/types';
import type { Goal } from '../script/types';

export const AUTO_HINT_MS = 90_000;

/**
 * Combined hint system: the spitz button (nextHint) and the auto hint after AUTO_HINT_MS without progress (tick)
 * share one step counter per goal: step 1 → 2 → 3 → 3 …
 */
export class HintSystem {
    private step = 0;
    private goalFlag: FlagId | null;
    private lastActivity: number;

    constructor(
        private readonly goals: Goal[],
        private readonly hasFlag: (f: FlagId) => boolean,
        private readonly now: () => number,
    ) {
        this.goalFlag = this.currentGoal()?.flag ?? null;
        this.lastActivity = now();
    }

    /** First goal whose flag is not set yet. */
    currentGoal(): Goal | null {
        return this.goals.find(g => !this.hasFlag(g.flag)) ?? null;
    }

    nextHint(): string | null {
        this.syncGoal();
        const g = this.currentGoal();
        this.lastActivity = this.now();
        if (!g) return null;
        const key = g.hintKeys[Math.min(this.step, 2)];
        this.step = Math.min(this.step + 1, 3);
        return key;
    }

    /** Restarts the timer; when the goal has changed the step counter goes back to 0. */
    notifyProgress(): void {
        this.syncGoal();
        this.lastActivity = this.now();
    }

    /** Hint key if AUTO_HINT_MS passed since the last progress/hint; the timer restarts. */
    tick(): string | null {
        if (this.now() - this.lastActivity < AUTO_HINT_MS) return null;
        return this.nextHint();
    }

    private syncGoal(): void {
        const flag = this.currentGoal()?.flag ?? null;
        if (flag !== this.goalFlag) {
            this.goalFlag = flag;
            this.step = 0;
        }
    }
}
