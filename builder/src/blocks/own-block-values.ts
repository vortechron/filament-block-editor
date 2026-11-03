import { parseShortCodes } from '@/lib/short-codes';
import type { OwnBlockDefinition, OwnBlockField } from '@/types';

/**
 * An own block keeps its values as one JSON object string, because
 * BlockNote props are plain text, numbers and booleans. These helpers
 * read and write that string and fill in the definition's defaults.
 */
export type OwnValues = Record<string, unknown>;

export function parseValues(values: unknown): OwnValues {
    if (typeof values !== 'string' || values.trim() === '') {
        return {};
    }

    try {
        const parsed: unknown = JSON.parse(values);

        return isPlainObject(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

export function serializeValues(values: OwnValues): string {
    return JSON.stringify(values);
}

/** What a field holds before anyone fills it. */
export function emptyValue(field: OwnBlockField): unknown {
    if (field.default !== undefined) {
        return structuredClone(field.default);
    }

    switch (field.type) {
        case 'toggle':
            return false;
        case 'number':
        case 'image':
            return null;
        case 'list':
            return [];
        case 'select':
            return field.options?.[0]?.value ?? '';
        default:
            return '';
    }
}

/** The block's values over the definition's defaults. */
export function valuesWithDefaults(
    definition: OwnBlockDefinition,
    values: OwnValues,
): OwnValues {
    const defaults = Object.fromEntries(
        definition.fields.map((field) => [
            field.name,
            definition.defaults && field.name in definition.defaults
                ? structuredClone(definition.defaults[field.name])
                : emptyValue(field),
        ]),
    );

    return { ...defaults, ...values };
}

/**
 * One line for the card in the editor: the first words, and list sizes.
 * A short code shows as its shop value's name (`labelOf`), or its key.
 */
export function summarizeValues(
    definition: OwnBlockDefinition,
    values: OwnValues,
    labelOf: (key: string) => string | null = () => null,
): string {
    const filled = valuesWithDefaults(definition, values);
    const parts: string[] = [];
    const firstText = definition.fields.find(
        (field) =>
            (field.type === 'text' || field.type === 'textarea') &&
            typeof filled[field.name] === 'string' &&
            (filled[field.name] as string).trim() !== '',
    );

    if (firstText) {
        parts.push(
            parseShortCodes((filled[firstText.name] as string).trim())
                .map((part) =>
                    part.type === 'text' ? part.text : (labelOf(part.key) ?? part.key),
                )
                .join(''),
        );
    }

    for (const field of definition.fields) {
        const rows = filled[field.name];

        if (field.type === 'list' && Array.isArray(rows) && rows.length > 0) {
            parts.push(String(rows.length));
        }
    }

    return parts.join(' · ');
}

function isPlainObject(value: unknown): value is OwnValues {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
