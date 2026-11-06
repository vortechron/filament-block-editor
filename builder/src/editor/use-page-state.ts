import { useEffect, useRef, useState } from 'react';
import { useHost } from '@/lib/host';
import {
    canRedo,
    canUndo,
    emptyHistory,
    type History,
    record,
    STEP_GROUP,
    redo as redoHistory,
    undo as undoHistory,
} from '@/lib/page-history';
import {
    copyTranslations,
    containsCopies,
    type BlockCopyMap,
} from '@/lib/translation-copies';
import { normalizeValue } from '@/lib/page-value';
import {
    tableIds,
    withoutDeletedTableTranslations,
} from '@/lib/table-identities';
import type { PageValue, SaveResult } from '@/types';

/** How long "Saved" shows after a save. */
const SAVED_FOR_MS = 2000;

/** The page before and after an undo or a redo. */
export type HistoryMove = { before: PageValue; after: PageValue };

/**
 * The page value being edited, and saving it through the host. It
 * replaces the old page form: `data` is the value, `isDirty` says
 * whether it changed since the last save, and `errors` holds what the
 * host's save refused, keyed like "sections.2.data.anchor".
 *
 * It keeps the undo history too (lib/page-history.ts), in memory only:
 * every change is recorded, in the group its caller names, and Save
 * leaves the history as it is.
 */
export function usePageState(
    initial: PageValue,
    onChange?: (value: PageValue) => void,
) {
    const { adapter } = useHost();
    const [data, setDataState] = useState(initial);
    const [saved, setSaved] = useState(() => JSON.stringify(initial));
    const [processing, setProcessing] = useState(false);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const latest = useRef(initial);
    // A table's IDs and locale maps belong to page history. Keep that owner
    // after deletion, so native history cannot resurrect an ID-stripped table.
    const tableHistorySections = useRef(
        new Set(
            initial.sections.flatMap((section) =>
                section.type === 'rich' &&
                tableIds(section.data.document).length
                    ? [section.id]
                    : [],
            ),
        ),
    );
    const savedTimer = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(savedTimer.current), []);
    const [history, setHistoryState] = useState(emptyHistory<PageValue>);
    const latestHistory = useRef(history);
    // The group of the step running now (inGroup), over the caller's own.
    const runningGroup = useRef<string | null>(null);
    const groupCount = useRef(0);
    const pendingCopies = useRef<{ mapping: BlockCopyMap; group: string }[]>(
        [],
    );

    function setHistory(next: History<PageValue>) {
        latestHistory.current = next;
        setHistoryState(next);
    }

    function show(next: PageValue) {
        latest.current = next;
        setDataState(next);
        onChange?.(next);
    }

    /** A group no other change has: a step of its own. */
    function newGroup(): string {
        groupCount.current += 1;

        return `${STEP_GROUP}${groupCount.current}`;
    }

    /**
     * Changes the value. `group` names what changed, like the words of
     * one section: changes in one group a moment apart are one step to
     * undo. Left out, the change is a step of its own.
     */
    function setData(
        update: PageValue | ((current: PageValue) => PageValue),
        group?: string,
    ) {
        const before = latest.current;
        let next = typeof update === 'function' ? update(before) : update;
        const ready = pendingCopies.current.filter((entry) =>
            containsCopies(next, entry.mapping),
        );
        pendingCopies.current = pendingCopies.current.filter(
            (entry) => !ready.includes(entry),
        );
        for (const entry of ready) next = copyTranslations(next, entry.mapping);
        next = withoutDeletedTableTranslations(before, next);
        for (const section of next.sections) {
            if (
                section.type === 'rich' &&
                tableIds(section.data.document).length
            )
                tableHistorySections.current.add(section.id);
        }

        if (next === before) {
            return;
        }

        const recorded = record(latestHistory.current, before, next, {
            group:
                runningGroup.current ?? ready[0]?.group ?? group ?? newGroup(),
            now: Date.now(),
        });

        // The same page again, like an editor writing its words back.
        if (recorded === latestHistory.current) {
            return;
        }

        setHistory(recorded);
        show(next);
    }

    function copyTextFor(mapping: BlockCopyMap) {
        if (!Object.keys(mapping).length) return;
        const group = runningGroup.current ?? newGroup();
        pendingCopies.current.push({ mapping, group });
        if (containsCopies(latest.current, mapping))
            setData(latest.current, group);
    }

    /**
     * Runs `run` with every change in it recorded in `group`, whatever
     * group the changes name themselves. A step already running keeps
     * its own group.
     */
    function inGroup<T>(group: string, run: () => T): T {
        if (runningGroup.current !== null) {
            return run();
        }

        runningGroup.current = group;

        try {
            return run();
        } finally {
            runningGroup.current = null;
        }
    }

    /**
     * Runs a builder action as one step of its own, like adding or
     * deleting a section or an item: it never joins the typing before
     * it, and typing after it never joins it.
     */
    function asStep<T>(run: () => T, group: string = newGroup()): T {
        return inGroup(group, run);
    }

    /** Goes back one step, without recording it. Null with nothing to undo. */
    function undo(): HistoryMove | null {
        return move(undoHistory(latestHistory.current, latest.current));
    }

    /** Goes forward one undone step. Null with nothing to redo. */
    function redo(): HistoryMove | null {
        return move(redoHistory(latestHistory.current, latest.current));
    }

    function move(
        result: { value: PageValue; history: History<PageValue> } | null,
    ): HistoryMove | null {
        if (result === null) {
            return null;
        }

        const before = latest.current;

        setHistory(result.history);
        show(result.value);

        return { before, after: result.value };
    }

    async function save(
        options: {
            onSuccess?: () => void;
            onError?: (errors: Record<string, string>) => void;
        } = {},
    ) {
        const value = latest.current;

        setProcessing(true);
        setRecentlySuccessful(false);

        let result: SaveResult;

        try {
            // The server stays the authority; the builder never sends junk.
            result = await adapter.save(normalizeValue(value));
        } catch (error) {
            result = {
                ok: false,
                errors: {
                    page:
                        error instanceof Error && error.message !== ''
                            ? error.message
                            : 'The page could not be saved.',
                },
            };
        }

        setProcessing(false);

        if (result && result.ok === false) {
            const next = result.errors ?? {};

            setErrors(next);
            options.onError?.(next);

            return;
        }

        setErrors({});
        setSaved(JSON.stringify(value));
        setRecentlySuccessful(true);
        window.clearTimeout(savedTimer.current);
        savedTimer.current = window.setTimeout(
            () => setRecentlySuccessful(false),
            SAVED_FOR_MS,
        );
        options.onSuccess?.();
    }

    return {
        data,
        setData,
        copyTextFor,
        /** The latest value, also between a change and the next draw. */
        current: () => latest.current,
        inGroup,
        asStep,
        /** A group of its own, for a step whose changes come at two times. */
        newGroup,
        undo,
        redo,
        /** Goes up when a change starts a new step, like a delete. */
        stepCount: () => latestHistory.current.started,
        canUndo: canUndo(history),
        canRedo: canRedo(history),
        /** Main bilingual table editors must not split structural history from locale maps. */
        hasTableHistory: (sectionId: string) =>
            tableHistorySections.current.has(sectionId),
        save,
        errors,
        clearErrors: () => setErrors({}),
        processing,
        recentlySuccessful,
        isDirty: JSON.stringify(data) !== saved,
    };
}

export type PageState = ReturnType<typeof usePageState>;
