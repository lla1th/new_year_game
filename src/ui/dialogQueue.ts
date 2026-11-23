import type { MoodId, SpeakerId } from '../game/data/types';
import type { DialogChoice } from '../game/data/schemas';

export interface DialogQueueLine { speaker: SpeakerId; key: string; mood?: MoodId; choices?: DialogChoice[]; retry?: boolean }
export interface DialogJob { lines: DialogQueueLine[]; onDone: () => void }

/** Queue of lines/dialogs shown one after another by DialogBox (pure logic, no Vue). */
export class DialogQueue {
    jobs: DialogJob[] = [];
    job: DialogJob | null = null;
    index = 0;

    get line(): DialogQueueLine | null {
        return this.job ? this.job.lines[this.index] ?? null : null;
    }

    get active(): boolean {
        return this.job !== null;
    }

    /** An empty job (e.g. unknown dialog) ends at once without touching the job on screen. */
    enqueue(j: DialogJob): void {
        if (j.lines.length === 0) { j.onDone(); return; }
        this.jobs.push(j);
        if (!this.job) this.nextJob();
    }

    /** Next line, or finish the job (its onDone runs after the next job is on screen). */
    advance(): void {
        const j = this.job;
        if (!j) return;
        if (this.index + 1 < j.lines.length) { this.index++; return; }
        this.nextJob();
        j.onDone();
    }

    /**
     * Ksyusha says the chosen line, then the optional reply, then the dialog continues as usual.
     * On a `retry` line a wrong choice (`correct === false`) repeats the same question afterwards (dialog-puzzle round).
     */
    choose(c: DialogChoice): void {
        const j = this.job;
        if (!j) return;
        const extra: DialogQueueLine[] = [{ speaker: 'ksyusha', key: c.key, mood: c.mood }];
        if (c.reply) extra.push({ speaker: c.reply.speaker, key: c.reply.key, mood: c.reply.mood });
        const question = j.lines[this.index];
        if (question.retry === true && c.correct === false) extra.push({ ...question });
        j.lines.splice(this.index + 1, 0, ...extra);
        j.lines[this.index] = { ...question, choices: undefined };
        this.advance();
    }

    private nextJob(): void {
        this.job = this.jobs.shift() ?? null;
        this.index = 0;
    }
}
