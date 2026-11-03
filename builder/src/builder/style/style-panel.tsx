import { ChevronDown, Monitor, MousePointer2, Smartphone, Tablet } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { type Translate, useT } from '@/lib/i18n';
import {
    allowsKey,
    cleanStyleValue,
    differsFromBase,
    withStyleValue,
} from '@/lib/style-bag';
import { cn } from '@/lib/utils';
import type { StyleBag, StyleVariant } from '@/types';
import { useBuilderContext } from '../builder-context';
import { ColorInput } from './color-input';
import { LengthInput } from './length-input';
import { useStyleChoices } from './style-choices';
import { STYLE_GROUPS, type StyleField } from './style-fields';
import { StyleRow } from './style-row';

const VARIANTS = [
    { value: 'desktop', label: 'Laptop', icon: Monitor },
    { value: 'tablet', label: 'Tablet', icon: Tablet },
    { value: 'phone', label: 'Phone', icon: Smartphone },
    { value: 'hover', label: 'Hover', icon: MousePointer2 },
] as const;

const HINTS: Record<StyleVariant, string> = {
    desktop: 'The base style, for every screen.',
    tablet: 'For screens up to 1024px wide. Empty means the laptop value.',
    phone: 'For screens up to 767px wide. Empty means the tablet or laptop value.',
    hover: 'When the pointer is over it. Only colours, shadow and opacity.',
};

/**
 * The "Style" tab of a section or an item: every key of the style bag,
 * in groups, per device. The device follows the canvas, and picking one
 * here moves the canvas too. Hover only shows the keys hover allows.
 */
export function StylePanel({
    bag,
    onChange,
}: {
    bag: StyleBag | null | undefined;
    /** The whole bag after a change, or null when it is empty. */
    onChange: (bag: StyleBag | null) => void;
}) {
    const t = useT();
    const { device, setDevice, isDesktop } = useBuilderContext();
    const [variant, setVariant] = useState<StyleVariant>(device);

    useEffect(() => setVariant(device), [device]);

    function pick(next: StyleVariant) {
        setVariant(next);

        if (next !== 'hover' && isDesktop) {
            setDevice(next);
        }
    }

    const groups = STYLE_GROUPS.map((group) => ({
        ...group,
        fields: group.fields.filter((field) => allowsKey(variant, field.key)),
    })).filter((group) => group.fields.length > 0);

    return (
        <div className="grid grid-cols-1 gap-4">
            <div className="grid gap-2">
                <div
                    role="radiogroup"
                    aria-label={t('Style for')}
                    className="bg-muted grid grid-cols-4 gap-1 rounded-lg p-1"
                >
                    {VARIANTS.map(({ value, label, icon: Icon }) => (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={variant === value}
                            aria-label={t(label)}
                            onClick={() => pick(value)}
                            className={cn(
                                'flex h-10 flex-col items-center justify-center gap-0.5 rounded-md text-[11px] font-medium transition-colors',
                                variant === value
                                    ? 'bg-card text-foreground dark:bg-input/70 shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Icon className="size-4" />
                            {t(label)}
                        </button>
                    ))}
                </div>
                <p className="text-muted-foreground text-xs">{t(HINTS[variant])}</p>
            </div>

            {groups.map((group, index) => (
                <details
                    key={`${variant}:${group.key}`}
                    open={index === 0 || group.fields.some((field) => differsFromBase(bag, variant, field.key))}
                    className="group/style bg-card rounded-xl border"
                >
                    <summary className="flex h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                        {t(group.label)}
                        {group.fields.some((field) => differsFromBase(bag, variant, field.key)) && (
                            <span className="size-2 rounded-full bg-[var(--builder-select)]" />
                        )}
                        <span className="flex-1" />
                        <ChevronDown className="text-muted-foreground size-4 transition-transform group-open/style:rotate-180" />
                    </summary>
                    <div className="grid grid-cols-1 gap-4 border-t p-3">
                        {group.fields.map((field) => (
                            <StyleFieldControl
                                key={field.key}
                                field={field}
                                variant={variant}
                                bag={bag}
                                onChange={onChange}
                            />
                        ))}
                    </div>
                </details>
            ))}
        </div>
    );
}

/** Where a device without its own value takes it from, and the value. */
function inheritedFrom(
    bag: StyleBag | null | undefined,
    variant: StyleVariant,
    field: StyleField,
    t: Translate,
): { from: string; value: string } | null {
    const order: [StyleVariant, string][] =
        variant === 'phone'
            ? [['tablet', 'Tablet'], ['desktop', 'Laptop']]
            : variant === 'desktop'
              ? []
              : [['desktop', 'Laptop']];

    for (const [from, label] of order) {
        const value = bag?.[from]?.[field.key];

        if (value !== undefined) {
            return { from: t(label), value };
        }
    }

    return null;
}

function StyleFieldControl({
    field,
    variant,
    bag,
    onChange,
}: {
    field: StyleField;
    variant: StyleVariant;
    bag: StyleBag | null | undefined;
    onChange: (bag: StyleBag | null) => void;
}) {
    const t = useT();
    const id = useId();
    const labelId = `${id}-label`;
    const { colors, fonts } = useStyleChoices();
    const own = bag?.[variant]?.[field.key] ?? null;
    const inherited = inheritedFrom(bag, variant, field, t);
    const label = t(field.label);
    const set = (value: string | null) =>
        onChange(withStyleValue(bag, variant, field.key, value));
    const { control } = field;
    const selectClass =
        'border-input bg-card focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]';

    return (
        <StyleRow
            styleKey={field.key}
            label={label}
            labelId={labelId}
            controlId={control.kind === 'color' ? undefined : id}
            isChanged={differsFromBase(bag, variant, field.key)}
            hasOwnValue={own !== null}
            inherited={inherited}
            onReset={() => set(null)}
        >
            {control.kind === 'length' && (
                <LengthInput
                    id={id}
                    label={label}
                    value={own}
                    placeholder={inherited?.value}
                    allowNegative={control.allowNegative}
                    extraUnit={control.extraUnit}
                    validate={(value) => cleanStyleValue(field.key, value)}
                    onChange={set}
                />
            )}
            {control.kind === 'color' && (
                <ColorInput labelId={labelId} value={own} choices={colors} onChange={set} />
            )}
            {control.kind === 'select' && (
                <select
                    id={id}
                    value={own ?? ''}
                    onChange={(event) => set(event.target.value || null)}
                    className={selectClass}
                >
                    <option value="">—</option>
                    {control.options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {t(option.label)}
                        </option>
                    ))}
                </select>
            )}
            {control.kind === 'font' && (
                <select
                    id={id}
                    value={own ?? ''}
                    onChange={(event) => set(event.target.value || null)}
                    className={selectClass}
                >
                    <option value="">—</option>
                    {fonts.map((font) => (
                        <option key={font.value} value={font.value}>
                            {font.builtIn ? t(font.label) : font.label}
                        </option>
                    ))}
                </select>
            )}
            {control.kind === 'opacity' && (
                <div className="flex items-center gap-3">
                    <input
                        id={id}
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={Number(own ?? inherited?.value ?? 1)}
                        onChange={(event) => set(event.target.value)}
                        className="accent-foreground h-10 min-w-0 flex-1"
                    />
                    <span className="text-muted-foreground w-10 text-right text-xs tabular-nums">
                        {Math.round(Number(own ?? inherited?.value ?? 1) * 100)}%
                    </span>
                </div>
            )}
        </StyleRow>
    );
}
