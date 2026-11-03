import { useHost } from '@/lib/host';
import { normalizeKit } from '@/lib/kit';
import type { Kit } from '@/types';
import { useSaveState } from '../use-save-state';

/**
 * The design kit being edited, and saving it through `adapter.saveKit`.
 * `kit` is always there, for the colour and font pickers; `canSave` (the
 * design panel) only when the host has `adapter.saveKit`. Gaps are saved
 * as the site's kit defaults.
 */
export function useKitState() {
    const { adapter, kit: initial, kitDefaults } = useHost();
    const saveKit = adapter.saveKit;
    const canSave = typeof saveKit === 'function';
    const state = useSaveState<Kit>({
        initial,
        save: canSave ? (kit) => saveKit(normalizeKit(kit, kitDefaults)) : null,
        errorKey: 'kit',
        fallbackError: 'The design could not be saved.',
    });

    return {
        kit: state.value,
        canSave,
        setKit: (update: (current: Kit) => Kit) => {
            if (canSave) {
                state.update(update);
            }
        },
        save: state.save,
        errors: state.errors,
        clearErrors: state.clearErrors,
        processing: state.processing,
        recentlySuccessful: state.recentlySuccessful,
        isDirty: state.isDirty,
    };
}

export type KitState = ReturnType<typeof useKitState>;
