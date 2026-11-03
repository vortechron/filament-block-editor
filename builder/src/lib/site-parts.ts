import RULES from '@/generated/rules.json';
import type {
    DocumentKind,
    OwnBlockField,
    PagePart,
    PartKey,
    SiteInfo,
} from '@/types';
import type { Translate } from './i18n';

/**
 * The header and footer the host shows on every page, and the shop info
 * form shown with them (docs/v2-plan.md, section 10).
 */

/** The parts every page shows (Enums\DocumentKind::parts()). */
export const PART_KEYS: readonly PartKey[] = RULES.part_kinds;

/** What the builder may edit (Enums\DocumentKind). */
const KINDS: readonly DocumentKind[] = RULES.document_kinds;

/** A part's name, like "Header", in the builder's language. */
export function partLabel(part: PartKey, t: Translate): string {
    return part === 'header' ? t('Header') : t('Footer');
}

export function isPartKey(value: unknown): value is PartKey {
    return (PART_KEYS as readonly unknown[]).includes(value);
}

export function normalizeParts(raw: unknown): PagePart[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    return raw
        .filter(
            (part): part is Record<string, unknown> =>
                typeof part === 'object' && part !== null && isPartKey(part.key),
        )
        .map((part) => ({
            key: part.key as PartKey,
            title: typeof part.title === 'string' ? part.title : '',
            editUrl: typeof part.editUrl === 'string' ? part.editUrl : '',
        }));
}

/** The shop info, or null when it is missing or has no group to show. */
export function normalizeSiteInfo(raw: unknown): SiteInfo | null {
    if (typeof raw !== 'object' || raw === null) {
        return null;
    }

    const source = raw as Record<string, unknown>;
    const groups = (Array.isArray(source.groups) ? source.groups : [])
        .filter(
            (group): group is Record<string, unknown> =>
                typeof group === 'object' &&
                group !== null &&
                typeof group.key === 'string' &&
                group.key !== '' &&
                Array.isArray(group.fields),
        )
        .map((group) => ({
            key: group.key as string,
            label: typeof group.label === 'string' ? group.label : (group.key as string),
            fields: (group.fields as unknown[]).filter(
                (field): field is OwnBlockField =>
                    typeof field === 'object' &&
                    field !== null &&
                    typeof (field as OwnBlockField).name === 'string' &&
                    typeof (field as OwnBlockField).type === 'string',
            ),
        }));
    const values = isRecord(source.values) ? source.values : {};

    if (groups.length === 0) {
        return null;
    }

    return {
        groups,
        values: Object.fromEntries(
            groups.map((group) => [
                group.key,
                isRecord(values[group.key]) ? (values[group.key] as Record<string, unknown>) : {},
            ]),
        ),
    };
}

export function normalizeKind(raw: unknown): DocumentKind {
    return (KINDS as readonly unknown[]).includes(raw) ? (raw as DocumentKind) : 'page';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
