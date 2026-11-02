import { Check } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { SectionData } from '@/types';
import { FONTS } from './rich-style-fields';

type Look = Pick<
    SectionData,
    | 'background'
    | 'background_color'
    | 'text_color'
    | 'font'
    | 'corners'
    | 'button'
    | 'align'
>;

type Preset = {
    label: string;
    /** The section's look. A function when it uses the page colour. */
    look: Look | ((accent: string) => Look);
};

const THEME: Look = {
    background: 'none',
    background_color: null,
    text_color: null,
    font: 'theme',
    corners: 'theme',
    button: 'theme',
    align: 'auto',
};

/**
 * Ready-made looks for one section: colours, heading font, corners and
 * buttons that go together. "Page theme" hands the section back to the
 * theme. A photo background stays when a look is picked.
 */
const PRESETS: Preset[] = [
    { label: 'Page theme', look: THEME },
    {
        label: 'Your colour',
        look: (accent) => ({
            ...THEME,
            background: 'color',
            background_color: accent,
        }),
    },
    {
        label: 'Dark',
        look: { ...THEME, background: 'color', background_color: '#0f172a' },
    },
    {
        label: 'Minimal',
        look: {
            ...THEME,
            font: 'grotesk',
            corners: 'square',
            button: 'outline',
            align: 'left',
        },
    },
    {
        label: 'Luxury',
        look: {
            background: 'color',
            background_color: '#f5f1ea',
            text_color: '#3f3a33',
            font: 'serif',
            corners: 'round',
            button: 'pill',
            align: 'center',
        },
    },
    {
        label: 'Flyer',
        look: {
            background: 'color',
            background_color: '#facc15',
            text_color: '#111111',
            font: 'poster',
            corners: 'square',
            button: 'shadow',
            align: 'auto',
        },
    },
    {
        label: 'Bold black',
        look: {
            background: 'color',
            background_color: '#0a0a0a',
            text_color: null,
            font: 'condensed',
            corners: 'square',
            button: 'shadow',
            align: 'left',
        },
    },
    {
        label: 'Fresh mint',
        look: {
            background: 'color',
            background_color: '#dcfce7',
            text_color: '#14532d',
            font: 'geometric',
            corners: 'round',
            button: 'pill',
            align: 'auto',
        },
    },
    {
        label: 'Blush',
        look: {
            background: 'color',
            background_color: '#fdf2f8',
            text_color: '#831843',
            font: 'serif',
            corners: 'round',
            button: 'pill',
            align: 'center',
        },
    },
    {
        label: 'Midnight',
        look: {
            background: 'color',
            background_color: '#1e1b4b',
            text_color: '#e0e7ff',
            font: 'geometric',
            corners: 'soft',
            button: 'pill',
            align: 'auto',
        },
    },
    {
        label: 'Sky',
        look: {
            background: 'color',
            background_color: '#e0f2fe',
            text_color: '#0c4a6e',
            font: 'grotesk',
            corners: 'soft',
            button: 'solid',
            align: 'auto',
        },
    },
    {
        label: 'Kopitiam',
        look: {
            background: 'color',
            background_color: '#1c1917',
            text_color: '#fde68a',
            font: 'mono',
            corners: 'square',
            button: 'shadow',
            align: 'left',
        },
    },
];

/** Whether the colour wants white words, like the page does. */
function isDark(hex: string): boolean {
    const [red, green, blue] = [1, 3, 5].map((start) =>
        parseInt(hex.slice(start, start + 2), 16),
    );

    return (red * 299 + green * 587 + blue * 114) / 1000 < 128;
}

function lookOf(preset: Preset, accent: string): Look {
    return typeof preset.look === 'function'
        ? preset.look(accent)
        : preset.look;
}

function isSameLook(data: SectionData, look: Look): boolean {
    const hasPhoto = data.background === 'image';

    return (
        (hasPhoto ||
            (data.background === look.background &&
                (look.background !== 'color' ||
                    data.background_color?.toLowerCase() ===
                        look.background_color))) &&
        data.text_color === look.text_color &&
        data.font === look.font &&
        data.corners === look.corners &&
        data.button === look.button &&
        data.align === look.align
    );
}

/**
 * One tap gives the section a ready-made look. The settings under it can
 * change any part afterwards.
 */
export function SectionStylePresets({
    data,
    accent,
    onChange,
}: {
    data: SectionData;
    /** The page colour, for "Your colour". */
    accent: string;
    onChange: (data: SectionData) => void;
}) {
    const t = useT();

    return (
        <div className="grid grid-cols-1 gap-1.5">
            <p className="text-sm font-medium">{t('Quick style')}</p>
            <div
                role="radiogroup"
                aria-label={t('Quick style')}
                className="grid grid-cols-4 gap-1.5"
            >
                {PRESETS.map((preset) => {
                    const look = lookOf(preset, accent);
                    const isChosen = isSameLook(data, look);
                    const background =
                        look.background === 'color' && look.background_color
                            ? look.background_color
                            : '#ffffff';
                    const ink =
                        look.text_color ??
                        (isDark(background) ? '#ffffff' : '#0f172a');
                    const family =
                        FONTS.find((font) => font.value === look.font)
                            ?.family ?? 'inherit';

                    return (
                        <button
                            key={preset.label}
                            type="button"
                            role="radio"
                            aria-checked={isChosen}
                            aria-label={t(preset.label)}
                            onClick={() =>
                                onChange({
                                    ...data,
                                    ...look,
                                    // A photo background stays.
                                    ...(data.background === 'image'
                                        ? {
                                              background: 'image' as const,
                                              background_color:
                                                  data.background_color,
                                          }
                                        : {}),
                                })
                            }
                            className={cn(
                                'focus-visible:ring-ring/50 grid gap-1 rounded-lg border p-1 text-center outline-none focus-visible:ring-[3px]',
                                isChosen
                                    ? 'border-foreground ring-foreground ring-1'
                                    : 'hover:border-foreground/40',
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className="relative grid h-11 place-items-center rounded-md border border-black/5"
                                style={{
                                    backgroundColor: background,
                                    color: ink,
                                }}
                            >
                                <span
                                    className="text-base leading-none"
                                    style={{ fontFamily: family }}
                                >
                                    Aa
                                </span>
                                <span
                                    className="absolute right-1 bottom-1 h-1.5 w-4"
                                    style={{
                                        backgroundColor: accent,
                                        borderRadius:
                                            look.button === 'pill' ||
                                            look.corners === 'round'
                                                ? 999
                                                : look.corners === 'square'
                                                  ? 0
                                                  : 2,
                                    }}
                                />
                                {isChosen && (
                                    <Check className="absolute top-1 right-1 size-3" />
                                )}
                            </span>
                            <span className="text-muted-foreground truncate text-[11px] leading-tight font-medium">
                                {t(preset.label)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
