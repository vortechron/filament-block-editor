import { Dices, RotateCcw } from 'lucide-react';
import { type ReactNode, useId } from 'react';
import { Input } from '@/ui/input';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type {
    RichAlign,
    RichButton,
    RichCorners,
    SectionData,
    SectionFont,
} from '@/types';
import { Field } from './fields';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/**
 * The heading fonts. Mirrors Enums\SectionFont. Each is drawn in its own
 * font when the host page loads it (the --font-* variables), else in a
 * close system font.
 */
export const FONTS: { value: SectionFont; label: string; family: string }[] = [
    { value: 'theme', label: 'Theme', family: 'inherit' },
    {
        value: 'grotesk',
        label: 'Bold',
        family: "var(--font-bricolage-grotesque, 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif)",
    },
    {
        value: 'condensed',
        label: 'Tall',
        family: "var(--font-barlow-condensed, 'Barlow Condensed', 'Arial Narrow', sans-serif-condensed, sans-serif)",
    },
    { value: 'serif', label: 'Luxury', family: "var(--font-bodoni-moda, 'Bodoni Moda', 'Didot', Georgia, serif)" },
    { value: 'poster', label: 'Poster', family: "var(--font-anton, Anton, Impact, 'Arial Black', sans-serif)" },
    { value: 'geometric', label: 'Modern', family: "var(--font-jost, Jost, 'Futura', 'Century Gothic', sans-serif)" },
    { value: 'mono', label: 'Typewriter', family: "var(--font-geist-mono, 'Geist Mono', ui-monospace, Menlo, monospace)" },
];

const ALIGNS: { value: RichAlign; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Centre' },
];

const CORNERS: { value: RichCorners; label: string }[] = [
    { value: 'theme', label: 'Theme' },
    { value: 'square', label: 'Square' },
    { value: 'soft', label: 'Soft' },
    { value: 'round', label: 'Round' },
];

const BUTTONS: { value: RichButton; label: string }[] = [
    { value: 'theme', label: 'Theme' },
    { value: 'solid', label: 'Solid' },
    { value: 'outline', label: 'Outline' },
    { value: 'pill', label: 'Pill' },
    { value: 'shadow', label: 'Shadow' },
];

/** Word colours that read well on most backgrounds. */
const TEXT_SWATCHES = [
    '#0f172a',
    '#ffffff',
    '#451a03',
    '#14532d',
    '#831843',
    '#1e1b4b',
];

/** Background and word colours that go together, for "Shuffle". */
const PALETTES: [string | null, string | null][] = [
    [null, null],
    [null, null],
    ['#0f0f0f', '#f5f5f4'],
    ['#1e1b4b', '#e0e7ff'],
    ['#14532d', '#ecfdf5'],
    ['#7f1d1d', '#fff1f2'],
    ['#fef3c7', '#451a03'],
    ['#f5f1ea', '#3f3a33'],
    ['#e0f2fe', '#0c4a6e'],
    ['#fdf2f8', '#831843'],
    ['#facc15', '#111111'],
];

function any<T>(choices: readonly T[]): T {
    return choices[Math.floor(Math.random() * choices.length)];
}

/**
 * A new style at random: a font, corners, buttons, alignment and, unless
 * the section has a background photo, colours.
 */
export function shuffledStyle(data: SectionData): SectionData {
    const style: SectionData = {
        ...data,
        font: any(FONTS.filter((font) => font.value !== data.font)).value,
        corners: any(CORNERS.slice(1)).value,
        button: any(BUTTONS.slice(1)).value,
        align: any(ALIGNS.slice(1)).value,
    };

    if (data.background === 'image') {
        return style;
    }

    const [background, text] = any(PALETTES);

    return background === null
        ? { ...style, background: 'none', text_color: null }
        : {
              ...style,
              background: 'color',
              background_color: background,
              text_color: text,
          };
}

/**
 * The section's own style on top of the page theme: heading font,
 * alignment, word colour, corners and buttons. Shown under the layout and
 * background in the section settings panel.
 */
export function RichStyleFields({
    data,
    onChange,
}: {
    data: SectionData;
    onChange: (data: SectionData) => void;
}) {
    const t = useT();
    const isThemeStyle =
        data.font === 'theme' &&
        data.align === 'auto' &&
        data.text_color === null &&
        data.corners === 'theme' &&
        data.button === 'theme';

    return (
        <div className="grid grid-cols-1 gap-5 border-t pt-5">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{t('Section style')}</p>
                <div className="flex gap-1.5">
                    {!isThemeStyle && (
                        <button
                            type="button"
                            onClick={() =>
                                onChange({
                                    ...data,
                                    font: 'theme',
                                    align: 'auto',
                                    text_color: null,
                                    corners: 'theme',
                                    button: 'theme',
                                })
                            }
                            className="text-muted-foreground hover:bg-secondary inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium"
                        >
                            <RotateCcw className="size-3.5" />
                            {t('Use the theme')}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => onChange(shuffledStyle(data))}
                        className="hover:bg-secondary inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium"
                    >
                        <Dices className="size-3.5" />
                        {t('Shuffle')}
                    </button>
                </div>
            </div>

            <ChoiceGrid
                label={t('Heading font')}
                value={data.font}
                columns="grid-cols-4"
                options={FONTS.map((font) => ({
                    value: font.value,
                    label: (
                        <>
                            <span
                                className="block text-lg leading-none"
                                style={{ fontFamily: font.family }}
                            >
                                Aa
                            </span>
                            <span className="mt-1 block">{t(font.label)}</span>
                        </>
                    ),
                }))}
                onChange={(font) => onChange({ ...data, font })}
            />

            <ChoiceGrid
                label={t('Text alignment')}
                value={data.align}
                columns="grid-cols-3"
                options={ALIGNS.map((option) => ({
                    value: option.value,
                    label: t(option.label),
                }))}
                onChange={(align) => onChange({ ...data, align })}
            />

            <TextColorField
                color={data.text_color}
                onChange={(text_color) => onChange({ ...data, text_color })}
            />

            <ChoiceGrid
                label={t('Corners')}
                value={data.corners}
                columns="grid-cols-4"
                options={CORNERS.map((option) => ({
                    value: option.value,
                    label: t(option.label),
                }))}
                onChange={(corners) => onChange({ ...data, corners })}
            />

            <ChoiceGrid
                label={t('Buttons')}
                value={data.button}
                columns="grid-cols-3"
                options={BUTTONS.map((option) => ({
                    value: option.value,
                    label: t(option.label),
                }))}
                onChange={(button) => onChange({ ...data, button })}
            />
        </div>
    );
}

/**
 * Small buttons in a grid where exactly one is chosen. Like
 * SegmentedChoice, but it wraps, so five choices fit the side panel.
 */
function ChoiceGrid<T extends string>({
    label,
    value,
    options,
    columns,
    onChange,
}: {
    label: string;
    value: T;
    options: { value: T; label: ReactNode }[];
    columns: string;
    onChange: (value: T) => void;
}) {
    return (
        <div className="grid grid-cols-1 gap-1.5">
            <p className="text-sm font-medium">{label}</p>
            <div
                role="radiogroup"
                aria-label={label}
                className={cn('grid gap-1.5', columns)}
            >
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={value === option.value}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'focus-visible:ring-ring/50 rounded-md border px-1.5 py-2 text-center text-xs font-medium transition-colors outline-none focus-visible:ring-[3px]',
                            value === option.value
                                ? 'border-foreground bg-secondary text-foreground'
                                : 'text-muted-foreground hover:bg-secondary/60',
                        )}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * The words' colour. "Auto" picks dark or white by the background.
 */
function TextColorField({
    color,
    onChange,
}: {
    color: string | null;
    onChange: (color: string | null) => void;
}) {
    const t = useT();
    const pickerId = useId();
    const isAuto = color === null;
    const isValid = isAuto || HEX_COLOR.test(color);

    return (
        <Field
            label={t('Text colour')}
            htmlFor={pickerId}
            error={isValid ? undefined : t('Use a colour like #0f172a.')}
        >
            <div
                role="radiogroup"
                aria-label={t('Text colour')}
                className="flex flex-wrap items-center gap-2"
            >
                <button
                    type="button"
                    role="radio"
                    aria-checked={isAuto}
                    onClick={() => onChange(null)}
                    className={cn(
                        'h-9 rounded-full border px-3 text-xs font-medium',
                        isAuto
                            ? 'border-foreground bg-secondary'
                            : 'text-muted-foreground',
                    )}
                >
                    {t('Auto')}
                </button>
                {TEXT_SWATCHES.map((swatch) => (
                    <button
                        key={swatch}
                        type="button"
                        role="radio"
                        aria-checked={color === swatch}
                        aria-label={swatch}
                        title={swatch}
                        onClick={() => onChange(swatch)}
                        className={cn(
                            'size-9 rounded-full border ring-offset-2',
                            color === swatch && 'ring-foreground ring-2',
                        )}
                        style={{ backgroundColor: swatch }}
                    />
                ))}
            </div>
            {!isAuto && (
                <div className="flex items-center gap-2">
                    <input
                        id={pickerId}
                        type="color"
                        value={isValid ? color : '#0f172a'}
                        aria-label={t('Pick your own text colour')}
                        className="border-input h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
                        onChange={(event) => onChange(event.target.value)}
                    />
                    <Input
                        value={color}
                        maxLength={7}
                        aria-label={t('Text colour code')}
                        className="w-32 font-mono"
                        onChange={(event) => onChange(event.target.value)}
                    />
                </div>
            )}
        </Field>
    );
}
