import type { RichSection, SyncedSectionOption } from '@/types';
import { isRef, normalizeValue } from './page-value';

/**
 * The synced sections the host offers (docs/v2-plan.md, section 5): each
 * holds one rich section that every page using it shows.
 */
export function normalizeSyncedSections(raw: unknown): SyncedSectionOption[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    return raw
        .filter(
            (entry): entry is Record<string, unknown> =>
                typeof entry === 'object' &&
                entry !== null &&
                isRef(entry.id) &&
                typeof entry.title === 'string',
        )
        .map((entry) => ({
            id: entry.id as number | string,
            title: entry.title as string,
            editUrl:
                typeof entry.editUrl === 'string' && entry.editUrl !== ''
                    ? entry.editUrl
                    : null,
            section: richSectionOf(entry.section),
        }));
}

/** The synced section a ref points to. Ids compare as text: 12 is "12". */
export function findSynced(
    synced: readonly SyncedSectionOption[],
    ref: number | string,
): SyncedSectionOption | undefined {
    return synced.find((entry) => String(entry.id) === String(ref));
}

/** One cleaned rich section, whatever the host sent. */
function richSectionOf(raw: unknown): RichSection {
    const [section] = normalizeValue([
        {
            ...(typeof raw === 'object' && raw !== null ? raw : {}),
            type: 'rich',
        },
    ]).sections;

    return section as RichSection;
}
