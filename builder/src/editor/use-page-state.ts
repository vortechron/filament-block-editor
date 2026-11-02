import { useRef, useState } from 'react';
import { useHost } from '@/lib/host';
import type { PageValue, SaveResult } from '@/types';

/** How long "Saved" shows after a save. */
const SAVED_FOR_MS = 2000;

/**
 * The page value being edited, and saving it through the host. It
 * replaces the old page form: `data` is the value, `isDirty` says
 * whether it changed since the last save, and `errors` holds what the
 * host's save refused, keyed like "sections.2.data.anchor".
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
    const savedTimer = useRef<number | undefined>(undefined);

    function setData(update: PageValue | ((current: PageValue) => PageValue)) {
        const next =
            typeof update === 'function' ? update(latest.current) : update;

        if (next === latest.current) {
            return;
        }

        latest.current = next;
        setDataState(next);
        onChange?.(next);
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
            result = await adapter.save(value);
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
        /** The latest value, also between a change and the next draw. */
        current: () => latest.current,
        save,
        errors,
        clearErrors: () => setErrors({}),
        processing,
        recentlySuccessful,
        isDirty: JSON.stringify(data) !== saved,
    };
}

export type PageState = ReturnType<typeof usePageState>;
