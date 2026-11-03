import RULES from '@/generated/rules.json';
import type { DynamicValueDefinition } from '@/types';

/**
 * Values the site fills in when the page is drawn, like the shop's phone
 * (docs/v2-plan.md, section 6). In text they are a `dynamic` inline item;
 * in a link or a picture they are stored as `@key`, like `@site.whatsapp`.
 */

/** The key rule of Content\DynamicValues::KEY, from the exported rules. */
export const DYNAMIC_KEY = new RegExp(`^(?:${RULES.dynamic_key})$`);

const TYPES: readonly DynamicValueDefinition['type'][] = ['text', 'link', 'image'];

/** The host's definitions, without any that break the rules. */
export function normalizeDynamicValues(raw: unknown): DynamicValueDefinition[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    const seen = new Set<string>();

    return raw
        .filter(
            (entry): entry is Record<string, unknown> =>
                typeof entry === 'object' &&
                entry !== null &&
                typeof entry.key === 'string' &&
                DYNAMIC_KEY.test(entry.key) &&
                typeof entry.label === 'string' &&
                (TYPES as readonly unknown[]).includes(entry.type),
        )
        .filter((entry) => {
            const isNew = !seen.has(entry.key as string);

            seen.add(entry.key as string);

            return isNew;
        })
        .map((entry) => ({
            key: entry.key as string,
            label: entry.label as string,
            type: entry.type as DynamicValueDefinition['type'],
            ...(typeof entry.group === 'string' && entry.group !== ''
                ? { group: entry.group }
                : {}),
            preview: typeof entry.preview === 'string' ? entry.preview : null,
            ...(typeof entry.settings === 'string' && entry.settings !== ''
                ? { settings: entry.settings }
                : {}),
        }));
}

/** The key in a stored `@key`, or null when the value is not one. */
export function dynamicRefKey(value: unknown): string | null {
    if (typeof value !== 'string' || !value.startsWith('@')) {
        return null;
    }

    const key = value.slice(1);

    return DYNAMIC_KEY.test(key) ? key : null;
}

/** The value stored for a definition in a link or a picture. */
export function dynamicRef(key: string): string {
    return `@${key}`;
}

export function findDynamicValue(
    values: readonly DynamicValueDefinition[],
    key: string,
): DynamicValueDefinition | undefined {
    return values.find((value) => value.key === key);
}

export function dynamicValuesOfType(
    values: readonly DynamicValueDefinition[],
    type: DynamicValueDefinition['type'],
): DynamicValueDefinition[] {
    return values.filter((value) => value.type === type);
}

/**
 * The values a search finds: every word typed is in the value's label, its
 * key or what it is now (its preview), in any case. An empty search finds all.
 */
export function filterDynamicValues(
    values: readonly DynamicValueDefinition[],
    query: string,
): DynamicValueDefinition[] {
    const words = query.toLocaleLowerCase().split(/\s+/).filter((word) => word !== '');

    return values.filter((value) => {
        const haystack = [value.label, value.key, value.preview ?? ''].join(' ').toLocaleLowerCase();

        return words.every((word) => haystack.includes(word));
    });
}

/** The values by their `group`, in the order the site sent them. */
export function groupDynamicValues(
    values: readonly DynamicValueDefinition[],
): { group: string; values: DynamicValueDefinition[] }[] {
    const groups = new Map<string, DynamicValueDefinition[]>();

    for (const value of values) {
        const group = value.group ?? '';

        groups.set(group, [...(groups.get(group) ?? []), value]);
    }

    return [...groups].map(([group, entries]) => ({ group, values: entries }));
}
