import { useRef, useState } from 'react';
import type { SaveResult } from '@/types';

/** How long "Saved" shows after a save. */
const SAVED_FOR_MS = 2000;

/**
 * A value the builder edits and saves on its own, beside the page: the
 * design kit, the shop info. The same shape as the page state
 * (use-page-state.ts), so the top bar treats all three alike.
 */
export function useSaveState<T>({
    initial,
    save,
    errorKey,
    fallbackError,
    onSaved,
}: {
    initial: T;
    /** Null when the host can not save this value: then it is never dirty. */
    save: ((value: T) => Promise<SaveResult>) | null;
    /** The error key for a save that throws. */
    errorKey: string;
    /** The error text for a save that throws without a message. */
    fallbackError: string;
    onSaved?: () => void;
}) {
    const [value, setValue] = useState<T>(initial);
    const [saved, setSaved] = useState(() => JSON.stringify(initial));
    const [processing, setProcessing] = useState(false);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const latest = useRef(initial);
    const savedTimer = useRef<number | undefined>(undefined);

    function update(change: (current: T) => T) {
        const next = change(latest.current);

        latest.current = next;
        setValue(next);
    }

    async function run(): Promise<boolean> {
        const current = latest.current;

        if (save === null) {
            return false;
        }

        setProcessing(true);
        setRecentlySuccessful(false);

        const result = await saveOrRefuse(save, current, errorKey, fallbackError);

        setProcessing(false);

        if (result && result.ok === false) {
            setErrors(result.errors ?? {});

            return false;
        }

        setErrors({});
        setSaved(JSON.stringify(current));
        setRecentlySuccessful(true);
        onSaved?.();
        window.clearTimeout(savedTimer.current);
        savedTimer.current = window.setTimeout(
            () => setRecentlySuccessful(false),
            SAVED_FOR_MS,
        );

        return true;
    }

    return {
        value,
        update,
        save: run,
        errors,
        clearErrors: () => setErrors({}),
        processing,
        recentlySuccessful,
        isDirty: save !== null && JSON.stringify(value) !== saved,
    };
}

/** The host's answer, or a refusal with the error a throwing save gave. */
async function saveOrRefuse<T>(
    save: (value: T) => Promise<SaveResult>,
    value: T,
    errorKey: string,
    fallbackError: string,
): Promise<SaveResult> {
    try {
        return await save(value);
    } catch (error) {
        const message = error instanceof Error && error.message !== '' ? error.message : fallbackError;

        return { ok: false, errors: { [errorKey]: message } };
    }
}

/** What the top bar needs from every value the builder saves. */
export type SaveStatus = {
    isDirty: boolean;
    processing: boolean;
    recentlySuccessful: boolean;
};

/** Many save states as one: dirty, saving or just saved when any of them is. */
export function combineSaveStatus(states: readonly SaveStatus[]) {
    return {
        hasUnsavedChanges: states.some((state) => state.isDirty),
        isSaving: states.some((state) => state.processing),
        recentlySaved: states.some((state) => state.recentlySuccessful),
    };
}
