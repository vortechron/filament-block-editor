import RULES from '@/generated/rules.json';
import type { StyleBag, StyleValues, StyleVariant } from '@/types';

/**
 * The style bag rules (docs/v2-plan.md, section 2). The keys, units and
 * words come from Styling\StyleBag through the exported rules
 * (builder/src/generated/rules.json); the value grammar is the same as
 * Styling\CssValue, checked against the server by the shared fixtures in
 * tests/fixtures/shared. The server cleans again and stays the authority;
 * this keeps the builder from sending a value the server would drop.
 */

const STYLE = RULES.style;

export const STYLE_VARIANTS: readonly StyleVariant[] = STYLE.variants;

/** Every key a style bag may hold, and the kind of value it takes. */
export const STYLE_KEYS = STYLE.keys;

export type StyleKey = keyof typeof STYLE_KEYS;

/** How a key's value is checked. */
export type StyleKind = (typeof STYLE_KEYS)[StyleKey];

export type LengthUnit = keyof typeof STYLE.length_units;

export const LENGTH_UNITS = Object.keys(STYLE.length_units) as LengthUnit[];

export const FONT_WEIGHTS = STYLE.font_weights;
export const TEXT_TRANSFORMS = STYLE.choices.text_transform;
export const TEXT_ALIGNS = STYLE.choices.text_align;
export const BORDER_STYLES = STYLE.choices.border_style;
export const SHADOWS = STYLE.shadows;

/** The only keys `hover` may hold. */
export const HOVER_KEYS: readonly StyleKey[] = STYLE.hover_keys;

/** Keys whose length must be 0 or more. */
const NON_NEGATIVE = new Set<StyleKey>(STYLE.non_negative);

const CHOICES: Partial<Record<StyleKey, readonly string[]>> = STYLE.choices;

/** A number with no sign, the same as Styling\CssValue::NUMBER. */
const NUMBER_PATTERN = '\\d{1,4}(?:\\.\\d{1,3})?|\\.\\d{1,3}';
const NUMBER = new RegExp(`^(?:${NUMBER_PATTERN})$`);
const LENGTH = new RegExp(
    `^(-?)(${NUMBER_PATTERN})(${LENGTH_UNITS.map(escapeRegExp).join('|')})$`,
);
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/;
const KIT_COLOR = new RegExp(`^kit:${STYLE.kit_key}$`);
/** A font key: SectionFont values and the host's font keys look like this. */
const FONT_KEY = /^[a-z0-9][a-z0-9_-]{0,39}$/;

export function isStyleKey(key: string): key is StyleKey {
    return Object.hasOwn(STYLE_KEYS, key);
}

/** May `variant` hold `key`? */
export function allowsKey(variant: StyleVariant, key: StyleKey): boolean {
    return variant !== 'hover' || HOVER_KEYS.includes(key);
}

/**
 * A length like "24px", or "0", in lower case with a leading zero
 * (`.5REM` is `0.5rem`). Negative only when `allowNegative`.
 */
export function cleanLength(raw: string, allowNegative = true): string | null {
    const value = raw.trim().toLowerCase();

    if (value === '0') {
        return value;
    }

    const match = LENGTH.exec(value);

    if (!match) {
        return null;
    }

    const [, sign, number, unit] = match;

    if (sign === '-' && !allowNegative) {
        return null;
    }

    return Number(number) <= STYLE.length_units[unit as LengthUnit]
        ? `${sign}${withLeadingZero(number)}${unit}`
        : null;
}

/** A colour as stored, in lower case: hex, `transparent` or `kit:<key>`. */
export function cleanColor(raw: string): string | null {
    const value = raw.trim().toLowerCase();

    return HEX.test(value) || value === 'transparent' || KIT_COLOR.test(value)
        ? value
        : null;
}

function inList(list: readonly string[], value: string): string | null {
    return list.includes(value) ? value : null;
}

function numberBetween(value: string, min: number, max: number): string | null {
    if (!NUMBER.test(value)) {
        return null;
    }

    const number = Number(value);

    return number >= min && number <= max ? withLeadingZero(value) : null;
}

/** `.5` as `0.5`. */
function withLeadingZero(number: string): string {
    return number.startsWith('.') ? `0${number}` : number;
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The value as the server keeps it, or null when it would be dropped.
 * Numbers are read as their text, so `0.5` works like `"0.5"`.
 */
export function cleanStyleValue(key: StyleKey, raw: unknown): string | null {
    const value =
        typeof raw === 'number' && Number.isFinite(raw)
            ? String(raw)
            : typeof raw === 'string'
              ? raw.trim()
              : null;

    if (value === null || value === '') {
        return null;
    }

    const allowNegative = !NON_NEGATIVE.has(key);

    switch (STYLE_KEYS[key]) {
        case 'length':
            return cleanLength(value, allowNegative);
        case 'color':
            return cleanColor(value);
        case 'font':
            return value === 'kit:heading' ||
                value === 'kit:body' ||
                (value !== 'theme' && FONT_KEY.test(value))
                ? value
                : null;
        case 'weight':
            return inList(FONT_WEIGHTS, value);
        case 'line_height':
            return (
                numberBetween(value, STYLE.line_height.min, STYLE.line_height.max) ??
                cleanLength(value, allowNegative)
            );
        case 'choice':
            return inList(CHOICES[key] ?? [], value);
        case 'radius':
            return value === 'kit:radius' ? value : cleanLength(value, allowNegative);
        case 'shadow':
            return inList(SHADOWS, value);
        case 'opacity':
            return numberBetween(value, STYLE.opacity.min, STYLE.opacity.max);
    }
}

/** One variant's values with every unknown key and bad value left out. */
export function cleanStyleValues(variant: StyleVariant, raw: unknown): StyleValues {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(raw).flatMap(([key, value]) => {
            if (!isStyleKey(key) || !allowsKey(variant, key)) {
                return [];
            }

            const clean = cleanStyleValue(key, value);

            return clean === null ? [] : [[key, clean]];
        }),
    );
}

/** The bag with empty variants left out, or null when nothing is left. */
export function cleanStyleBag(raw: unknown): StyleBag | null {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        return null;
    }

    const bag: StyleBag = Object.fromEntries(
        STYLE_VARIANTS.flatMap((variant) => {
            const values = cleanStyleValues(
                variant,
                (raw as Record<string, unknown>)[variant],
            );

            return Object.keys(values).length === 0 ? [] : [[variant, values]];
        }),
    );

    return Object.keys(bag).length === 0 ? null : bag;
}

/**
 * The bag with one value set, or taken out when `value` is null or not
 * allowed. Returns null when the bag ends up empty. Never changes `bag`.
 */
export function withStyleValue(
    bag: StyleBag | null | undefined,
    variant: StyleVariant,
    key: StyleKey,
    value: string | null,
): StyleBag | null {
    const { [key]: _old, ...others } = bag?.[variant] ?? {};
    const clean = value === null ? null : cleanStyleValue(key, value);

    return cleanStyleBag({
        ...bag,
        [variant]: clean === null ? others : { ...others, [key]: clean },
    });
}

/**
 * Does `variant` set `key` to something else than the laptop value? On the
 * laptop, any value of its own differs from the theme's.
 */
export function differsFromBase(
    bag: StyleBag | null | undefined,
    variant: StyleVariant,
    key: StyleKey,
): boolean {
    const own = bag?.[variant]?.[key];

    if (own === undefined) {
        return false;
    }

    return variant === 'desktop' || own !== bag?.desktop?.[key];
}
