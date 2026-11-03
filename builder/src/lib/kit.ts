import RULES from '@/generated/rules.json';
import type { Kit, KitColor } from '@/types';
import { cleanColor, cleanLength, FONT_WEIGHTS, TEXT_TRANSFORMS } from './style-bag';

/**
 * The design kit as the builder edits it. Mirrors Design\Kit
 * (docs/v2-plan.md, section 3); the lists, limits and package defaults
 * come from the exported rules (builder/src/generated/rules.json). The
 * host sends the current kit and its own defaults (Kit::defaults());
 * this only keeps the panels safe from a missing or odd value.
 */

const KIT = RULES.kit;

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
} as const satisfies Record<(typeof KIT.colors)[number], string>;

export type KitColorKey = (typeof KIT.colors)[number];

export const KIT_COLOR_KEYS: readonly KitColorKey[] = KIT.colors;

export const MAX_CUSTOM_COLORS = KIT.max_custom_colors;

export const BUTTON_STYLES = KIT.button_styles;
export const BUTTON_SIZES = KIT.button_sizes;
export const FORM_STYLES = KIT.form_styles;
export const FORM_LABELS = KIT.form_labels;

/** The package defaults: Design\Kit::PACKAGE_DEFAULTS, today's look. */
export const DEFAULT_KIT: Kit = {
    ...KIT.defaults,
    colors: { ...KIT.defaults.colors },
    custom_colors: [],
    fonts: { ...KIT.defaults.fonts },
    text: { ...KIT.defaults.text },
    buttons: { ...KIT.defaults.buttons },
    forms: { ...KIT.defaults.forms },
};

const KEY = new RegExp(`^(?:${RULES.style.kit_key})$`);

const pickText = (value: unknown, fallback: string): string =>
    typeof value === 'string' && value !== '' ? value : fallback;

const pickFrom = (list: readonly string[], value: unknown, fallback: string) =>
    typeof value === 'string' && list.includes(value) ? value : fallback;

/** A size or a corner: a length in px, rem or em, or 0 (Design\Kit::size()). */
const pickSize = (value: unknown, fallback: string): string => {
    const length = typeof value === 'string' ? cleanLength(value, false) : null;

    return length !== null && (length === '0' || /(px|rem|em)$/.test(length)) ? length : fallback;
};

const hexColor = (value: unknown): string | null => {
    const color = typeof value === 'string' ? cleanColor(value) : null;

    return color !== null && color.startsWith('#') ? color : null;
};

const section = (raw: unknown): Record<string, unknown> =>
    typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

/**
 * A whole kit from whatever the host sent. Gaps are filled from `base`:
 * the host's defaults (options.kitDefaults), else the package's.
 */
export function normalizeKit(raw: unknown, base: Kit = DEFAULT_KIT): Kit {
    const source = section(raw);
    const colors = section(source.colors);
    const fonts = section(source.fonts);
    const text = section(source.text);
    const buttons = section(source.buttons);
    const forms = section(source.forms);

    return {
        version: KIT.version,
        colors: Object.fromEntries(
            KIT_COLOR_KEYS.map((key) => [
                key,
                hexColor(colors[key]) ?? base.colors[key] ?? DEFAULT_KIT.colors[key],
            ]),
        ),
        custom_colors: Array.isArray(source.custom_colors)
            ? cleanCustomColors(source.custom_colors)
            : base.custom_colors,
        fonts: {
            heading: pickText(fonts.heading, base.fonts.heading),
            body: pickText(fonts.body, base.fonts.body),
        },
        text: {
            base_size: pickSize(text.base_size, base.text.base_size),
            heading_weight: pickFrom(FONT_WEIGHTS, text.heading_weight, base.text.heading_weight),
        },
        radius: pickSize(source.radius, base.radius),
        buttons: {
            style: pickFrom(BUTTON_STYLES, buttons.style, base.buttons.style),
            radius: pickSize(buttons.radius, base.buttons.radius),
            size: pickFrom(BUTTON_SIZES, buttons.size, base.buttons.size),
            text_transform: pickFrom(TEXT_TRANSFORMS, buttons.text_transform, base.buttons.text_transform),
            font_weight: pickFrom(FONT_WEIGHTS, buttons.font_weight, base.buttons.font_weight),
        },
        forms: {
            style: pickFrom(FORM_STYLES, forms.style, base.forms.style),
            radius: pickSize(forms.radius, base.forms.radius),
            labels: pickFrom(FORM_LABELS, forms.labels, base.forms.labels),
        },
    };
}

/**
 * Up to 12 custom colours with a free key that is not one of the 8 fixed
 * ones, and a colour code. Like Design\Kit, one without a colour is left out.
 */
function cleanCustomColors(raw: readonly unknown[]): KitColor[] {
    const seen = new Set<string>(KIT_COLOR_KEYS);

    return raw
        .map(section)
        .filter((color) => {
            const key = color.key;
            const ok =
                typeof key === 'string' &&
                KEY.test(key) &&
                !seen.has(key) &&
                hexColor(color.value) !== null;

            if (ok) {
                seen.add(key as string);
            }

            return ok;
        })
        .slice(0, MAX_CUSTOM_COLORS)
        .map((color) => ({
            key: color.key as string,
            label: pickText(color.label, color.key as string).slice(0, KIT.custom_label_length),
            value: hexColor(color.value) as string,
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
export function kitColorChoices(kit: Kit): KitColorChoice[] {
    return [
        ...KIT_COLOR_KEYS.map((key) => ({
            key,
            label: KIT_COLOR_LABELS[key],
            value: kit.colors[key] ?? DEFAULT_KIT.colors[key],
            fixed: true,
        })),
        ...kit.custom_colors.map((color) => ({ ...color, fixed: false })),
    ];
}
