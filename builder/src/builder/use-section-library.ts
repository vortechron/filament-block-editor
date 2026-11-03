import { useState } from 'react';
import { useHost } from '@/lib/host';
import { normalizeTemplates } from '@/lib/page-value';
import type {
    SectionTemplate,
    SectionTemplateInput,
    SyncedSectionOption,
} from '@/types';

/**
 * The sections the builder can add or point to: the ready-made templates
 * (with the ones saved while building) and the synced sections. A section
 * saved as a template or made synced shows here at once, without a reload.
 */
export function useSectionLibrary(initialTemplates: SectionTemplate[]) {
    const { syncedSections } = useHost();
    const [templates, setTemplates] = useState(initialTemplates);
    const [synced, setSynced] = useState(syncedSections);

    function addTemplate(input: SectionTemplateInput) {
        const [template] = normalizeTemplates([input]);

        if (template) {
            setTemplates((current) => [
                ...current.filter((entry) => entry.key !== template.key),
                template,
            ]);
        }
    }

    function addSynced(entry: SyncedSectionOption) {
        setSynced((current) => [
            ...current.filter((known) => String(known.id) !== String(entry.id)),
            entry,
        ]);
    }

    return { templates, addTemplate, synced, addSynced };
}

export type SectionLibrary = ReturnType<typeof useSectionLibrary>;
