import type { Kit, KitColor } from '@/types';
import { cleanColor, cleanLength, FONT_WEIGHTS, TEXT_TRANSFORMS } from './style-bag';

/**
 * The design kit as the builder edits it. Mirrors Design\Kit
 * (docs/v2-plan.md, section 3). The host sends a kit the server already
 * cleaned; this only keeps the panels safe from a missing or odd value.
 */

/** The 8 fixed colours, in the order the panels list them, with their names. */
export const KIT_COLOR_LABELS = {
    primary: 'Primary',
    secondary: 'Secondary',
    accent: 'Accent',
    text: 'Text',
    muted: 'Muted text',
    background: 'Background',
    surface: 'Surface',
    border: 'Border',
} as const;

export type KitColorKey = keyof typeof KIT_COLOR_LABELS;

export const KIT_COLOR_KEYS = Object.keys(KIT_COLOR_LABELS) as KitColorKey[];

export const MAX_CUSTOM_COLORS = 12;

export const BUTTON_STYLES = ['solid', 'outline', 'pill', 'shadow'] as const;
export const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;
export const FORM_STYLES = ['outline', 'filled', 'underline'] as const;
export const FORM_LABELS = ['above', 'hidden'] as const;

/** The package defaults (Kit::defaults() before the host's config). */
export const DEFAULT_KIT: Kit = {
    version: 1,
    colors: {
        primary: '#2563eb',
        secondary: '#0f172a',
        accent: '#f59e0b',
        text: '#0f172a',
        muted: '#64748b',
        background: '#ffffff',
        surface: '#f8fafc',
        border: '#e2e8f0',
    },
    custom_colors: [],
    fonts: { heading: 'theme', body: 'theme' },
    text: { base_size: '16px', heading_weight: '700' },
    radius: '8px',
    buttons: {
        style: 'solid',
        radius: '8px',
        size: 'md',
        text_transform: 'none',
        font_weight: '600',
    },
    forms: { style: 'outline', radius: '8px', labels: 'above' },
};

const KEY = /^[a-z0-9-]{1,30}$/;

const pickText = (value: unknown, fallback: string): string =>
    typeof value === 'string' && value !== '' ? value : fallback;

const pickFrom = (list: readonly string[], value: unknown, fallback: string) =>
    typeof value === 'string' && list.includes(value) ? value : fallback;

const pickLength = (value: unknown, fallback: string): string =>
    (typeof value === 'string' ? cleanLength(value, false) : null) ?? fallback;

const pickHex = (value: unknown, fallback: string): string => {
    const color = typeof value === 'string' ? cleanColor(value) : null;

    return color !== null && color.startsWith('#') ? color : fallback;
};

const section = (raw: unknown): Record<string, unknown> =>
    typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

/** A whole kit from whatever the host sent, with the defaults filling gaps. */
export function normalizeKit(raw: unknown): Kit {
    const source = section(raw);
    const colors = section(source.colors);
    const fonts = section(source.fonts);
    const text = section(source.text);
    const buttons = section(source.buttons);
    const forms = section(source.forms);
    const base = DEFAULT_KIT;

    return {
        version: 1,
        colors: Object.fromEntries(
            KIT_COLOR_KEYS.map((key) => [key, pickHex(colors[key], base.colors[key])]),
        ),
        custom_colors: cleanCustomColors(source.custom_colors),
        fonts: {
            heading: pickText(fonts.heading, base.fonts.heading),
            body: pickText(fonts.body, base.fonts.body),
        },
        text: {
            base_size: pickLength(text.base_size, base.text.base_size),
            heading_weight: pickFrom(FONT_WEIGHTS, text.heading_weight, base.text.heading_weight),
        },
        radius: pickLength(source.radius, base.radius),
        buttons: {
            style: pickFrom(BUTTON_STYLES, buttons.style, base.buttons.style),
            radius: pickLength(buttons.radius, base.buttons.radius),
            size: pickFrom(BUTTON_SIZES, buttons.size, base.buttons.size),
            text_transform: pickFrom(TEXT_TRANSFORMS, buttons.text_transform, base.buttons.text_transform),
            font_weight: pickFrom(FONT_WEIGHTS, buttons.font_weight, base.buttons.font_weight),
        },
        forms: {
            style: pickFrom(FORM_STYLES, forms.style, base.forms.style),
            radius: pickLength(forms.radius, base.forms.radius),
            labels: pickFrom(FORM_LABELS, forms.labels, base.forms.labels),
        },
    };
}

/** Up to 12 custom colours with a free key that is not one of the 8 fixed ones. */
function cleanCustomColors(raw: unknown): KitColor[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    const seen = new Set<string>(KIT_COLOR_KEYS);

    return raw
        .map(section)
        .filter((color) => {
            const key = color.key;
            const ok = typeof key === 'string' && KEY.test(key) && !seen.has(key);

            if (ok) {
                seen.add(key as string);
            }

            return ok;
        })
        .slice(0, MAX_CUSTOM_COLORS)
        .map((color) => ({
            key: color.key as string,
            label: pickText(color.label, color.key as string),
            value: pickHex(color.value, '#000000'),
        }));
}

/** A key for a new custom colour, like "colour-3", that no colour uses yet. */
export function newCustomColorKey(kit: Kit): string {
    const taken = new Set([...KIT_COLOR_KEYS, ...kit.custom_colors.map((color) => color.key)]);
    let number = kit.custom_colors.length + 1;

    while (taken.has(`colour-${number}`)) {
        number += 1;
    }

    return `colour-${number}`;
}

/** A kit colour the colour pickers offer. `label` of a fixed colour is still English. */
export type KitColorChoice = KitColor & { fixed: boolean };

/** The kit's colours for the colour pickers: the 8 fixed ones first. */
export function kitColorChoices(kit: Kit | null): KitColorChoice[] {
    const current = kit ?? DEFAULT_KIT;

    return [
        ...KIT_COLOR_KEYS.map((key) => ({
            key,
            label: KIT_COLOR_LABELS[key],
            value: current.colors[key] ?? DEFAULT_KIT.colors[key],
            fixed: true,
        })),
        ...current.custom_colors.map((color) => ({ ...color, fixed: false })),
    ];
}
