import { useState } from 'react';
import { normalizeDynamicValues } from '@/lib/dynamic-values';
import { useHost } from '@/lib/host';
import type { DynamicValueDefinition, SaveSiteInfoResult } from '@/types';
import { useSaveState } from '../use-save-state';

type Values = Record<string, Record<string, unknown>>;

/**
 * The shop info being edited (in the top bar's panel, or the group a shop
 * info row opened), and saving it through `adapter.saveSiteInfo`. After a
 * save `reloads` goes up, so the canvas draws the page again: the header
 * and footer show the new info. When the host answers with the dynamic
 * values read again, `onDynamicValues` gets them, for the chips and rows.
 */
export function useSiteInfoState({
    onDynamicValues,
}: {
    onDynamicValues?: (values: DynamicValueDefinition[]) => void;
} = {}) {
    const { adapter, siteInfo } = useHost();
    const saveSiteInfo = adapter.saveSiteInfo;
    const canSave = siteInfo !== null && typeof saveSiteInfo === 'function';
    const [reloads, setReloads] = useState(0);
    const state = useSaveState<Values, SaveSiteInfoResult>({
        initial: siteInfo?.values ?? {},
        save: canSave ? saveSiteInfo : null,
        errorKey: 'siteInfo',
        fallbackError: 'The shop info could not be saved.',
        onSaved: (result) => {
            setReloads((count) => count + 1);

            if (Array.isArray(result?.dynamicValues)) {
                onDynamicValues?.(normalizeDynamicValues(result.dynamicValues));
            }
        },
    });

    return {
        values: state.value,
        /** The host has a shop info form and can save it. */
        canSave,
        setGroup: (key: string, group: Record<string, unknown>) =>
            state.update((current) => ({ ...current, [key]: group })),
        save: state.save,
        errors: state.errors,
        clearErrors: state.clearErrors,
        processing: state.processing,
        recentlySuccessful: state.recentlySuccessful,
        /** Goes up after every save, to draw the page again. */
        reloads,
        isDirty: state.isDirty,
    };
}

export type SiteInfoState = ReturnType<typeof useSiteInfoState>;
