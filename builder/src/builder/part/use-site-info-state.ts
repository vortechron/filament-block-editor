import { useRef, useState } from 'react';
import { useHost } from '@/lib/host';
import type { SaveResult } from '@/types';

type Values = Record<string, Record<string, unknown>>;

/** How long "Saved" shows after a save. */
const SAVED_FOR_MS = 2000;

/**
 * The shop info being edited with the header and footer, and saving it
 * through `adapter.saveSiteInfo`. The same shape as the page and kit
 * states. After a save `reloads` goes up, so the canvas draws the page
 * again: the header and footer show the new info.
 */
export function useSiteInfoState() {
    const { adapter, siteInfo } = useHost();
    const initial: Values = siteInfo?.values ?? {};
    const [values, setValues] = useState<Values>(initial);
    const [saved, setSaved] = useState(() => JSON.stringify(initial));
    const [processing, setProcessing] = useState(false);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [reloads, setReloads] = useState(0);
    const latest = useRef(initial);
    const savedTimer = useRef<number | undefined>(undefined);

    function setGroup(key: string, group: Record<string, unknown>) {
        const next = { ...latest.current, [key]: group };

        latest.current = next;
        setValues(next);
    }

    async function save(): Promise<boolean> {
        const value = latest.current;

        if (siteInfo === null || typeof adapter.saveSiteInfo !== 'function') {
            return false;
        }

        setProcessing(true);
        setRecentlySuccessful(false);

        let result: SaveResult;

        try {
            result = await adapter.saveSiteInfo(value);
        } catch (error) {
            result = {
                ok: false,
                errors: {
                    siteInfo:
                        error instanceof Error && error.message !== ''
                            ? error.message
                            : 'The shop info could not be saved.',
                },
            };
        }

        setProcessing(false);

        if (result && result.ok === false) {
            setErrors(result.errors ?? {});

            return false;
        }

        setErrors({});
        setSaved(JSON.stringify(value));
        setRecentlySuccessful(true);
        setReloads((count) => count + 1);
        window.clearTimeout(savedTimer.current);
        savedTimer.current = window.setTimeout(
            () => setRecentlySuccessful(false),
            SAVED_FOR_MS,
        );

        return true;
    }

    return {
        values,
        setGroup,
        save,
        errors,
        clearErrors: () => setErrors({}),
        processing,
        recentlySuccessful,
        /** Goes up after every save, to draw the page again. */
        reloads,
        isDirty: siteInfo !== null && JSON.stringify(values) !== saved,
    };
}

export type SiteInfoState = ReturnType<typeof useSiteInfoState>;
