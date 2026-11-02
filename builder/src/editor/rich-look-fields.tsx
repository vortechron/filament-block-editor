import { Check, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { finishAnchor, typeAnchor } from '@/lib/page-value';
import { Input } from '@/ui/input';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type {
    RichBackground,
    RichPadding,
    SectionData,
    SectionLayout,
} from '@/types';
import { Field, SwitchRow } from './fields';
import { LAYOUT_ICONS } from '../builder/section-thumbs';
import { ImageField } from './image-field';
import { RichStyleFields } from './rich-style-fields';
import { SectionStylePresets } from './section-style-presets';
import { SegmentedChoice } from './segmented-choice';

type RichData = SectionData;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/**
 * A colour background with a code the server cannot use. The server drops
 * it without a word, so the section card warns about it.
 */
export function hasInvalidBackgroundColor(data: RichData): boolean {
    return (
        data.background === 'color' &&
        !HEX_COLOR.test(data.background_color ?? '')
    );
}

/** Light colours keep dark text. Dark ones turn the text white. */
const SWATCHES = [
    { value: '#f8fafc', label: 'Light grey' },
    { value: '#fef3c7', label: 'Cream' },
    { value: '#fde2e4', label: 'Blush' },
    { value: '#dcfce7', label: 'Mint' },
    { value: '#dbeafe', label: 'Sky' },
    { value: '#0f172a', label: 'Navy' },
    { value: '#14532d', label: 'Forest' },
    { value: '#7f1d1d', label: 'Maroon' },
];

const BACKGROUNDS: { value: RichBackground; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'color', label: 'Colour' },
    { value: 'image', label: 'Photo' },
];

/**
 * Mirrors Enums\SectionLayout, with short hints. The icons are the ones
 * the builder shows (section-thumbs.tsx).
 */
const LAYOUTS: {
    value: SectionLayout;
    label: string;
    hint: string;
}[] = [
    {
        value: 'plain',
        label: 'Plain',
        hint: 'Text in one easy-to-read column.',
    },
    {
        value: 'hero',
        label: 'Hero',
        hint: 'The big first screen. Your first photo sits beside the words on a laptop.',
    },
    {
        value: 'product',
        label: 'Showcase',
        hint: 'Your first photo or slideshow on the left, the heading, points and button on the right.',
    },
    {
        value: 'poster',
        label: 'Poster',
        hint: 'Your first photo fills the screen and big words sit on it.',
    },
    {
        value: 'editorial',
        label: 'Magazine',
        hint: 'Everything up to the first heading sits big on the left. The rest reads like a magazine story.',
    },
    {
        value: 'cards',
        label: 'Cards',
        hint: 'Each small heading (Heading 3) starts a card.',
    },
    {
        value: 'bento',
        label: 'Bento',
        hint: 'Each small heading (Heading 3) starts a tile. The first tile is the biggest. Add a photo to a tile to fill it.',
    },
    {
        value: 'steps',
        label: 'Steps',
        hint: 'Each small heading (Heading 3) is a step with a big number: 01, 02, 03.',
    },
    {
        value: 'stats',
        label: 'Big numbers',
        hint: 'Each small heading (Heading 3) is a big number, like "4 jam". The line under it is its label.',
    },
    {
        value: 'ticks',
        label: 'Ticks',
        hint: 'Each list item becomes a tile. Start one with ❌ for a cross.',
    },
    {
        value: 'compare',
        label: 'Compare',
        hint: 'Two columns side by side. Each small heading (Heading 3) starts a column. Start points with ❌ or ✅.',
    },
    {
        value: 'marquee',
        label: 'Ticker',
        hint: 'Your list items scroll past in a band, like a news ticker. Keep each one short.',
    },
    {
        value: 'reviews',
        label: 'Reviews',
        hint: 'Each quote becomes a review card. Put "★★★★★ — Name" under it.',
    },
    {
        value: 'faq',
        label: 'FAQ',
        hint: 'Each toggle becomes a question that opens.',
    },
    {
        value: 'highlight',
        label: 'Highlight',
        hint: 'Everything on a raised card. For a promise or an important note.',
    },
    {
        value: 'banner',
        label: 'Banner',
        hint: 'A bold band in your page colour. For a last call to action.',
    },
];

const PADDINGS: { value: RichPadding; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'sm', label: 'S' },
    { value: 'md', label: 'M' },
    { value: 'lg', label: 'L' },
    { value: 'xl', label: 'XL' },
];

/**
 * The look of a section: how it is laid out, what sits behind it, how
 * much space it has and its link name. Shown on the section's Style tab.
 * The words and pictures are in the section's own editor.
 */
export function RichLookFields({
    data,
    accent,
    onChange,
}: {
    data: RichData;
    /** The page colour, for the quick styles. */
    accent: string;
    onChange: (data: RichData) => void;
}) {
    const t = useT();

    return (
        <div className="grid grid-cols-1 gap-5">
            <LayoutField
                layout={data.layout}
                onChange={(layout) => onChange({ ...data, layout })}
            />

            <SectionStylePresets
                data={data}
                accent={accent}
                onChange={onChange}
            />

            <div className="grid grid-cols-1 gap-1.5">
                <p className="text-sm font-medium">{t('Background')}</p>
                <SegmentedChoice
                    label={t('Background')}
                    value={data.background}
                    options={BACKGROUNDS.map((option) => ({
                        ...option,
                        label: t(option.label),
                    }))}
                    onChange={(background) =>
                        onChange({
                            ...data,
                            background,
                            background_color:
                                background === 'color' &&
                                data.background_color === null
                                    ? SWATCHES[0].value
                                    : data.background_color,
                        })
                    }
                />
            </div>

            {data.background === 'color' && (
                <BackgroundColorField
                    color={data.background_color ?? ''}
                    onChange={(background_color) =>
                        onChange({ ...data, background_color })
                    }
                />
            )}

            {data.background === 'image' && (
                <>
                    <ImageField
                        label={t('Background photo')}
                        url={data.image}
                        onChange={(image) => onChange({ ...data, image })}
                    />
                    <TintField
                        tint={data.tint}
                        onChange={(tint) => onChange({ ...data, tint })}
                    />
                    <SwitchRow
                        label={t('Put the text on a white card')}
                        description={t('Easier to read on a busy photo.')}
                        checked={data.card}
                        onCheckedChange={(card) => onChange({ ...data, card })}
                    />
                </>
            )}

            <div className="grid grid-cols-1 gap-1.5">
                <p className="text-sm font-medium">
                    {t('Space around the content')}
                </p>
                <SegmentedChoice
                    label={t('Space around the content')}
                    value={data.padding}
                    options={PADDINGS.map((option) => ({
                        ...option,
                        label: t(option.label),
                    }))}
                    onChange={(padding) => onChange({ ...data, padding })}
                />
            </div>

            <SwitchRow
                label={t('Full width')}
                description={t(
                    'No side space and no width limit, so the section reaches both edges.',
                )}
                checked={data.width === 'full'}
                onCheckedChange={(full) =>
                    onChange({ ...data, width: full ? 'full' : 'normal' })
                }
            />

            <AnchorField
                anchor={data.anchor}
                onChange={(anchor) => onChange({ ...data, anchor })}
            />

            <RichStyleFields data={data} onChange={onChange} />
        </div>
    );
}

/**
 * How the section arranges its blocks on the page. The words stay the
 * same, so switching is always safe.
 */
function LayoutField({
    layout,
    onChange,
}: {
    layout: SectionLayout;
    onChange: (layout: SectionLayout) => void;
}) {
    const t = useT();
    const chosen = LAYOUTS.find((option) => option.value === layout);

    return (
        <div className="grid grid-cols-1 gap-1.5">
            <p className="text-sm font-medium">{t('Layout')}</p>
            <div
                role="radiogroup"
                aria-label={t('Layout')}
                className="grid grid-cols-4 gap-2"
            >
                {LAYOUTS.map((option) => {
                    const isChosen = option.value === layout;
                    const Icon: LucideIcon = LAYOUT_ICONS[option.value];

                    return (
                        <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={isChosen}
                            onClick={() => onChange(option.value)}
                            className={cn(
                                'focus-visible:ring-ring/50 flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px]',
                                isChosen
                                    ? 'border-foreground bg-secondary text-foreground'
                                    : 'text-muted-foreground hover:bg-secondary/60',
                            )}
                        >
                            <Icon className="size-4" aria-hidden="true" />
                            {t(option.label)}
                        </button>
                    );
                })}
            </div>
            {chosen && (
                <p className="text-muted-foreground text-xs">
                    {t(chosen.hint)}
                </p>
            )}
        </div>
    );
}

function BackgroundColorField({
    color,
    onChange,
}: {
    color: string;
    onChange: (color: string | null) => void;
}) {
    const t = useT();
    const pickerId = useId();
    const isValid = HEX_COLOR.test(color);

    return (
        <Field
            label={t('Background colour')}
            htmlFor={pickerId}
            error={isValid ? undefined : t('Use a colour like #0f172a.')}
        >
            <div
                role="radiogroup"
                aria-label={t('Ready-made background colours')}
                className="flex flex-wrap gap-2"
            >
                {SWATCHES.map((swatch) => {
                    const isChosen = color.toLowerCase() === swatch.value;

                    return (
                        <button
                            key={swatch.value}
                            type="button"
                            role="radio"
                            aria-checked={isChosen}
                            aria-label={t(swatch.label)}
                            title={t(swatch.label)}
                            onClick={() => onChange(swatch.value)}
                            className={cn(
                                'focus-visible:ring-ring/50 grid size-9 place-items-center rounded-full border ring-offset-2 transition outline-none focus-visible:ring-[3px]',
                                isChosen && 'ring-foreground ring-2',
                            )}
                            style={{ backgroundColor: swatch.value }}
                        >
                            {isChosen && (
                                <Check className="size-4 text-slate-500 mix-blend-difference" />
                            )}
                        </button>
                    );
                })}
            </div>
            <div className="flex items-center gap-2">
                <input
                    id={pickerId}
                    type="color"
                    value={isValid ? color : '#ffffff'}
                    aria-label={t('Pick your own background colour')}
                    className="border-input h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
                    onChange={(event) => onChange(event.target.value)}
                />
                <Input
                    value={color}
                    maxLength={7}
                    aria-label={t('Background colour code')}
                    className="w-32 font-mono"
                    onChange={(event) => onChange(event.target.value)}
                />
            </div>
        </Field>
    );
}

/**
 * The section's id on the page, so a menu link like #about jumps to it.
 * It is lower-cased and dashed as it is typed; empty means none.
 */
function AnchorField({
    anchor,
    onChange,
}: {
    anchor: string | null;
    onChange: (anchor: string | null) => void;
}) {
    const t = useT();
    const id = useId();
    // What is typed, with a dash at the end kept until typing stops.
    const [typed, setTyped] = useState(anchor ?? '');

    useEffect(() => {
        setTyped((current) =>
            finishAnchor(current) === anchor ? current : (anchor ?? ''),
        );
    }, [anchor]);

    return (
        <Field
            label={t('Link name (#)')}
            htmlFor={id}
            hint={t('Used by menu links like #tentang')}
        >
            <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm">
                    #
                </span>
                <Input
                    id={id}
                    value={typed}
                    maxLength={40}
                    placeholder="tentang"
                    autoComplete="off"
                    spellCheck={false}
                    className="pl-7 font-mono"
                    onChange={(event) => {
                        const next = typeAnchor(event.target.value);

                        setTyped(next);
                        onChange(finishAnchor(next));
                    }}
                    onBlur={() => setTyped(finishAnchor(typed) ?? '')}
                />
            </div>
        </Field>
    );
}

function TintField({
    tint,
    onChange,
}: {
    tint: number;
    onChange: (tint: number) => void;
}) {
    const t = useT();
    const sliderId = useId();

    return (
        <Field
            label={t('Darken the photo: :tint%', { tint })}
            htmlFor={sliderId}
            hint={t('White text needs a darker photo to stay easy to read.')}
        >
            <input
                id={sliderId}
                type="range"
                min={0}
                max={100}
                step={5}
                value={tint}
                className="accent-foreground w-full"
                onChange={(event) => onChange(Number(event.target.value))}
            />
        </Field>
    );
}
