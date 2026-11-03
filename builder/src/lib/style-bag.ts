import type { StyleBag, StyleValues, StyleVariant } from '@/types';

/**
 * The style bag rules, ported from Styling\StyleBag (docs/v2-plan.md,
 * section 2). The server cleans again and stays the authority; this keeps
 * the builder from sending a value the server would drop.
 */

export const STYLE_VARIANTS: readonly StyleVariant[] = [
    'desktop',
    'tablet',
    'phone',
    'hover',
];

export const LENGTH_UNITS = ['px', 'rem', 'em', '%', 'vw', 'vh'] as const;

export type LengthUnit = (typeof LENGTH_UNITS)[number];

/** The biggest number each unit allows. */
const LENGTH_LIMITS: Record<LengthUnit, number> = {
    px: 2000,
    rem: 200,
    em: 200,
    '%': 100,
    vw: 100,
    vh: 100,
};

const LENGTH = /^(-?\d+(?:\.\d{1,3})?)(px|rem|em|%|vw|vh)$/;
const NUMBER = /^\d+(?:\.\d{1,3})?$/;
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/;
const KIT_COLOR = /^kit:[a-z0-9-]{1,30}$/;
/** A font key: SectionFont values and the host's font keys look like this. */
const FONT_KEY = /^[a-z0-9][a-z0-9_-]{0,39}$/;

export const FONT_WEIGHTS = ['300', '400', '500', '600', '700', '800', '900'] as const;
export const TEXT_TRANSFORMS = ['none', 'uppercase', 'lowercase', 'capitalize'] as const;
export const TEXT_ALIGNS = ['left', 'center', 'right', 'justify'] as const;
export const BORDER_STYLES = ['none', 'solid', 'dashed', 'dotted'] as const;
export const SHADOWS = ['none', 'sm', 'md', 'lg', 'xl'] as const;

/** How a key's value is checked. */
export type StyleKind =
    | 'size'
    | 'length'
    | 'color'
    | 'font'
    | 'weight'
    | 'line-height'
    | 'transform'
    | 'align'
    | 'border-style'
    | 'radius'
    | 'shadow'
    | 'opacity';

/** Every key a style bag may hold, and how its value is checked. */
export const STYLE_KEYS = {
    padding_top: 'size',
    padding_right: 'size',
    padding_bottom: 'size',
    padding_left: 'size',
    margin_top: 'length',
    margin_bottom: 'length',
    width: 'size',
    max_width: 'size',
    min_height: 'size',
    gap: 'size',
    color: 'color',
    background_color: 'color',
    border_color: 'color',
    font_family: 'font',
    font_size: 'length',
    letter_spacing: 'length',
    font_weight: 'weight',
    line_height: 'line-height',
    text_transform: 'transform',
    text_align: 'align',
    border_width: 'size',
    border_style: 'border-style',
    radius: 'radius',
    shadow: 'shadow',
    opacity: 'opacity',
} as const satisfies Record<string, StyleKind>;

export type StyleKey = keyof typeof STYLE_KEYS;

/** The only keys `hover` may hold. */
export const HOVER_KEYS: readonly StyleKey[] = [
    'color',
    'background_color',
    'border_color',
    'shadow',
    'opacity',
];

export function isStyleKey(key: string): key is StyleKey {
    return Object.hasOwn(STYLE_KEYS, key);
}

/** May `variant` hold `key`? */
export function allowsKey(variant: StyleVariant, key: StyleKey): boolean {
    return variant !== 'hover' || HOVER_KEYS.includes(key);
}

/** A length like "24px", or "0". Negative only when `allowNegative`. */
export function cleanLength(value: string, allowNegative = true): string | null {
    if (value === '0') {
        return value;
    }

    const match = LENGTH.exec(value);

    if (!match) {
        return null;
    }

    const number = Number(match[1]);
    const unit = match[2] as LengthUnit;

    if ((!allowNegative && number < 0) || Math.abs(number) > LENGTH_LIMITS[unit]) {
        return null;
    }

    return value;
}

/** A colour as stored: hex in lower case, `transparent` or `kit:<key>`. */
export function cleanColor(value: string): string | null {
    const lower = value.toLowerCase();

    if (HEX.test(lower) || lower === 'transparent') {
        return lower;
    }

    return KIT_COLOR.test(value) ? value : null;
}

function inList(list: readonly string[], value: string): string | null {
    return list.includes(value) ? value : null;
}

function numberBetween(value: string, min: number, max: number): string | null {
    if (!NUMBER.test(value)) {
        return null;
    }

    const number = Number(value);

    return number >= min && number <= max ? value : null;
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

    switch (STYLE_KEYS[key]) {
        case 'size':
            return cleanLength(value, false);
        case 'length':
            return cleanLength(value);
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
        case 'line-height':
            return numberBetween(value, 0.8, 3) ?? cleanLength(value, false);
        case 'transform':
            return inList(TEXT_TRANSFORMS, value);
        case 'align':
            return inList(TEXT_ALIGNS, value);
        case 'border-style':
            return inList(BORDER_STYLES, value);
        case 'radius':
            return value === 'kit:radius' ? value : cleanLength(value, false);
        case 'shadow':
            return inList(SHADOWS, value);
        case 'opacity':
            return numberBetween(value, 0, 1);
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
 * What `variant` shows for `key` when it has no value of its own: the
 * phone takes the tablet's, the tablet and hover take the laptop's.
 */
export function inheritedStyleValue(
    bag: StyleBag | null | undefined,
    variant: StyleVariant,
    key: StyleKey,
): string | null {
    const order: StyleVariant[] =
        variant === 'phone' ? ['tablet', 'desktop'] : variant === 'desktop' ? [] : ['desktop'];

    for (const from of order) {
        const value = bag?.[from]?.[key];

        if (value !== undefined) {
            return value;
        }
    }

    return null;
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
