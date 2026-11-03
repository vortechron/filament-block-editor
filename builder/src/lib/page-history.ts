/**
 * The page's undo history, as plain values: the page before each step,
 * and the pages undone. The page state (editor/use-page-state.ts) keeps
 * one; nothing here knows about React, so the tests bring their own clock.
 *
 * A step is one or more changes. A change joins the step before it when
 * it is in the same group (like the words of one section) and comes
 * within MERGE_MS of the change before it, so typing a sentence is one
 * step. A change in another group always starts a new step: a builder
 * action (add, delete, move a section or an item, a template) gets a
 * group of its own, which is its checkpoint. Such a group starts with
 * STEP_GROUP, and its changes join up however far apart they come, like
 * a blank section and the item put in it once its editor has loaded.
 */

/** The most steps kept. The oldest one drops. */
export const HISTORY_LIMIT = 100;

/** Changes this close together, in one group, are one step. */
export const MERGE_MS = 1000;

/** The start of a builder action's own group: no time limit to join. */
export const STEP_GROUP = 'step:';

export type History<T> = {
    /** The value before each step, the latest step last. */
    readonly past: readonly T[];
    /** The values undone, the next one to redo last. */
    readonly future: readonly T[];
    /** The last change, while the next change may still join its step. */
    readonly last: { readonly group: string; readonly at: number } | null;
    /** How many steps were ever started: it goes up with every new step. */
    readonly started: number;
};

export function emptyHistory<T>(): History<T> {
    return { past: [], future: [], last: null, started: 0 };
}

export function canUndo<T>(history: History<T>): boolean {
    return history.past.length > 0;
}

export function canRedo<T>(history: History<T>): boolean {
    return history.future.length > 0;
}

/** The history after the value changed from `before` to `after`. */
export function record<T>(
    history: History<T>,
    before: T,
    after: T,
    change: { group: string; now: number },
): History<T> {
    if (isSame(before, after)) {
        return history;
    }

    const { last, past } = history;
    const joins =
        last !== null &&
        last.group === change.group &&
        (change.group.startsWith(STEP_GROUP) || change.now - last.at <= MERGE_MS);

    // Typed and taken back again: the step changes nothing, so it goes.
    if (joins && isSame(after, past.at(-1))) {
        return { ...history, past: past.slice(0, -1), future: [], last: null };
    }

    return {
        past: joins ? past : [...past, before].slice(-HISTORY_LIMIT),
        future: [],
        last: { group: change.group, at: change.now },
        started: joins ? history.started : history.started + 1,
    };
}

/**
 * A group for a change from a panel: `scope` and the fields that
 * changed, like "look:<section id>:anchor". Typing in one box is one
 * group; touching another setting, even a moment later, is another.
 * Fields are followed three levels deep, so in a style bag a laptop
 * padding and a phone margin are different fields.
 */
export function changeGroup(scope: string, before: unknown, after: unknown): string {
    return `${scope}:${changedPaths(before, after, 3).join(',')}`;
}

function changedPaths(before: unknown, after: unknown, depth: number, at = ''): string[] {
    if (before === after) {
        return [];
    }

    if (depth === 0 || !isRecord(before) || !isRecord(after)) {
        return [at];
    }

    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();

    return keys.flatMap((key) =>
        changedPaths(before[key], after[key], depth - 1, at === '' ? key : `${at}.${key}`),
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Values are plain data: the same data is the same value. Parts that did
 * not change keep their object, so a change to one section of a page
 * looks only into that section, and nothing is turned into JSON.
 */
export function isSame(one: unknown, other: unknown): boolean {
    if (one === other) {
        return true;
    }

    if (Array.isArray(one) || Array.isArray(other)) {
        return (
            Array.isArray(one) &&
            Array.isArray(other) &&
            one.length === other.length &&
            one.every((item, index) => isSame(item, other[index]))
        );
    }

    if (!isRecord(one) || !isRecord(other)) {
        return false;
    }

    // A key left out and a key set to undefined are the same, as in JSON.
    const keys = new Set([...Object.keys(one), ...Object.keys(other)]);

    return [...keys].every((key) => isSame(one[key], other[key]));
}

/** The value before the last step, and the history after going back. */
export function undo<T>(
    history: History<T>,
    present: T,
): { value: T; history: History<T> } | null {
    const value = history.past.at(-1);

    if (value === undefined) {
        return null;
    }

    return {
        value,
        history: {
            ...history,
            past: history.past.slice(0, -1),
            future: [...history.future, present],
            last: null,
        },
    };
}

/** The value the last undo left, and the history after going forward. */
export function redo<T>(
    history: History<T>,
    present: T,
): { value: T; history: History<T> } | null {
    const value = history.future.at(-1);

    if (value === undefined) {
        return null;
    }

    return {
        value,
        history: {
            ...history,
            past: [...history.past, present],
            future: history.future.slice(0, -1),
            last: null,
        },
    };
}
