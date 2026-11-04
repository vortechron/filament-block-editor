import type { OwnBlockDefinition } from '@/types';

export type OwnBlockSource = {
    /** The block's description, when it helps: see ownBlockSource(). */
    note: string | null;
    /** The host screen where the block's data is changed. */
    link: { label: string; url: string } | null;
    /** Nothing to set and nothing to say: the panel says so. */
    isEmpty: boolean;
};

/**
 * What a block's settings say about where its content comes from: the
 * screen its data is changed on (OwnBlock::editedAt()), and its
 * description when the data is changed there or the block has no field
 * this person can change. So a block like a list of items never opens on
 * a blank Settings tab.
 */
export function ownBlockSource(
    definition: OwnBlockDefinition,
    developer: boolean,
): OwnBlockSource {
    const shown = definition.fields.filter(
        (field) => developer || field.developerOnly !== true,
    );
    const description = definition.description?.trim() || null;
    const link = definition.editedAt ?? null;
    const note = link !== null || shown.length === 0 ? description : null;

    return {
        note,
        link,
        isEmpty: shown.length === 0 && note === null && link === null,
    };
}
