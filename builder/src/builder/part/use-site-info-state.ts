import { useState } from 'react';
import { useHost } from '@/lib/host';
import { useSaveState } from '../use-save-state';

type Values = Record<string, Record<string, unknown>>;

/**
 * The shop info being edited (in the top bar's panel, the header and
 * footer, or the card of an item or a section that shows it), and saving
 * it through `adapter.saveSiteInfo`. After a save `reloads` goes up, so
 * the canvas draws the page again: the header and footer show the new info.
 */
export function useSiteInfoState() {
    const { adapter, siteInfo } = useHost();
    const saveSiteInfo = adapter.saveSiteInfo;
    const canSave = siteInfo !== null && typeof saveSiteInfo === 'function';
    const [reloads, setReloads] = useState(0);
    const state = useSaveState<Values>({
        initial: siteInfo?.values ?? {},
        save: canSave ? saveSiteInfo : null,
        errorKey: 'siteInfo',
        fallbackError: 'The shop info could not be saved.',
        onSaved: () => setReloads((count) => count + 1),
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
