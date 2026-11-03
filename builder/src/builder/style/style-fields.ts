import type { StyleKey } from '@/lib/style-bag';

/** How a style key is edited. */
export type StyleControl =
    | { kind: 'length'; allowNegative?: boolean; extraUnit?: 'none' | 'kit' }
    | { kind: 'color' }
    | { kind: 'font' }
    | { kind: 'select'; options: readonly { value: string; label: string }[] }
    | { kind: 'opacity' };

export type StyleField = { key: StyleKey; label: string; control: StyleControl };

export type StyleGroup = { key: string; label: string; fields: StyleField[] };

const size = { kind: 'length' } as const;
const length = { kind: 'length', allowNegative: true } as const;
const color = { kind: 'color' } as const;

/** The ways to turn letters into capitals. */
export const TRANSFORMS = [
    { value: 'none', label: 'As typed' },
    { value: 'uppercase', label: 'ALL CAPITALS' },
    { value: 'lowercase', label: 'all small letters' },
    { value: 'capitalize', label: 'First Letter Of Each Word' },
] as const;

/** Font weights by name, 300 to 900. */
export const WEIGHTS = [
    { value: '300', label: 'Light' },
    { value: '400', label: 'Normal' },
    { value: '500', label: 'Medium' },
    { value: '600', label: 'Semi-bold' },
    { value: '700', label: 'Bold' },
    { value: '800', label: 'Extra bold' },
    { value: '900', label: 'Heaviest' },
] as const;

/**
 * The style panel's groups: Spacing, Size, Colour, Text style and Border
 * and corners, with every key of the style bag (lib/style-bag.ts). The
 * labels are English and go through t().
 */
export const STYLE_GROUPS: StyleGroup[] = [
    {
        key: 'spacing',
        label: 'Spacing',
        fields: [
            { key: 'padding_top', label: 'Space inside, top', control: size },
            { key: 'padding_right', label: 'Space inside, right', control: size },
            { key: 'padding_bottom', label: 'Space inside, bottom', control: size },
            { key: 'padding_left', label: 'Space inside, left', control: size },
            { key: 'margin_top', label: 'Space outside, top', control: length },
            { key: 'margin_bottom', label: 'Space outside, bottom', control: length },
            { key: 'gap', label: 'Gap between items', control: size },
        ],
    },
    {
        key: 'size',
        label: 'Size',
        fields: [
            { key: 'width', label: 'Width', control: size },
            { key: 'max_width', label: 'Largest width', control: size },
            { key: 'min_height', label: 'Smallest height', control: size },
        ],
    },
    {
        key: 'colour',
        label: 'Colour',
        fields: [
            { key: 'color', label: 'Text colour', control: color },
            { key: 'background_color', label: 'Background colour', control: color },
            { key: 'opacity', label: 'Opacity', control: { kind: 'opacity' } },
        ],
    },
    {
        key: 'text',
        label: 'Text style',
        fields: [
            { key: 'font_family', label: 'Font', control: { kind: 'font' } },
            { key: 'font_size', label: 'Text size', control: size },
            {
                key: 'font_weight',
                label: 'Text weight',
                control: { kind: 'select', options: WEIGHTS },
            },
            {
                key: 'line_height',
                label: 'Line height',
                control: { kind: 'length', extraUnit: 'none' },
            },
            { key: 'letter_spacing', label: 'Letter spacing', control: length },
            {
                key: 'text_transform',
                label: 'Capital letters',
                control: { kind: 'select', options: TRANSFORMS },
            },
            {
                key: 'text_align',
                label: 'Alignment',
                control: {
                    kind: 'select',
                    options: [
                        { value: 'left', label: 'Left' },
                        { value: 'center', label: 'Centre' },
                        { value: 'right', label: 'Right' },
                        { value: 'justify', label: 'Both edges' },
                    ],
                },
            },
        ],
    },
    {
        key: 'border',
        label: 'Border and corners',
        fields: [
            { key: 'border_width', label: 'Border width', control: size },
            {
                key: 'border_style',
                label: 'Border line',
                control: {
                    kind: 'select',
                    options: [
                        { value: 'none', label: 'None' },
                        { value: 'solid', label: 'Solid' },
                        { value: 'dashed', label: 'Dashes' },
                        { value: 'dotted', label: 'Dots' },
                    ],
                },
            },
            { key: 'border_color', label: 'Border colour', control: color },
            {
                key: 'radius',
                label: 'Corners',
                control: { kind: 'length', extraUnit: 'kit' },
            },
            {
                key: 'shadow',
                label: 'Shadow',
                control: {
                    kind: 'select',
                    options: [
                        { value: 'none', label: 'None' },
                        { value: 'sm', label: 'S' },
                        { value: 'md', label: 'M' },
                        { value: 'lg', label: 'L' },
                        { value: 'xl', label: 'XL' },
                    ],
                },
            },
        ],
    },
];
