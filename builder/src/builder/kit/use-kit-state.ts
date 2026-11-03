import { useRef, useState } from 'react';
import { useHost } from '@/lib/host';
import { normalizeKit } from '@/lib/kit';
import type { Kit, SaveResult } from '@/types';

/** How long "Saved" shows after a save. */
const SAVED_FOR_MS = 2000;

/**
 * The design kit being edited, and saving it through `adapter.saveKit`.
 * The same shape as the page state (use-page-state.ts). `kit` is always
 * there, for the colour and font pickers; `canSave` (the design panel)
 * only when the host has `adapter.saveKit`.
 */
export function useKitState() {
    const { adapter, kit: initial, kitDefaults } = useHost();
    const canSave = typeof adapter.saveKit === 'function';
    const [kit, setKitState] = useState<Kit>(initial);
    const [saved, setSaved] = useState(() => JSON.stringify(initial));
    const [processing, setProcessing] = useState(false);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const latest = useRef(initial);
    const savedTimer = useRef<number | undefined>(undefined);

    function setKit(update: (current: Kit) => Kit) {
        if (!canSave) {
            return;
        }

        const next = update(latest.current);

        latest.current = next;
        setKitState(next);
    }

    async function save(): Promise<boolean> {
        const value = latest.current;

        if (typeof adapter.saveKit !== 'function') {
            return false;
        }

        setProcessing(true);
        setRecentlySuccessful(false);

        let result: SaveResult;

        try {
            result = await adapter.saveKit(normalizeKit(value, kitDefaults));
        } catch (error) {
            result = {
                ok: false,
                errors: {
                    kit:
                        error instanceof Error && error.message !== ''
                            ? error.message
                            : 'The design could not be saved.',
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
        window.clearTimeout(savedTimer.current);
        savedTimer.current = window.setTimeout(
            () => setRecentlySuccessful(false),
            SAVED_FOR_MS,
        );

        return true;
    }

    return {
        kit,
        canSave,
        setKit,
        save,
        errors,
        clearErrors: () => setErrors({}),
        processing,
        recentlySuccessful,
        isDirty: canSave && JSON.stringify(kit) !== saved,
    };
}

export type KitState = ReturnType<typeof useKitState>;
