import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import {
    KIT_COLOR_KEYS,
    KIT_COLOR_LABELS,
    MAX_CUSTOM_COLORS,
    newCustomColorKey,
} from '@/lib/kit';
import { cleanColor } from '@/lib/style-bag';
import type { Kit, KitColor } from '@/types';
import { Input } from '@/ui/input';
import { KitSection } from './kit-section';

/** Only full colour codes, like #c59d6e, go into the kit. */
function hexOrNull(text: string): string | null {
    const color = cleanColor(text.trim());

    return color !== null && color.startsWith('#') ? color : null;
}

/** A colour swatch to pick from and its code, kept while it is typed. */
function ColorField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const t = useT();
    const [code, setCode] = useState(value);

    useEffect(() => setCode(value), [value]);

    return (
        <div className="flex items-center gap-2">
            <input
                type="color"
                value={/^#[0-9a-f]{6}$/.test(value) ? value : '#000000'}
                aria-label={t('Pick :label', { label })}
                className="border-input h-10 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
                onChange={(event) => onChange(event.target.value.toLowerCase())}
            />
            <input
                type="text"
                value={code}
                maxLength={9}
                aria-label={t(':label colour code', { label })}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => {
                    const clean = hexOrNull(event.target.value);

                    setCode(event.target.value);

                    if (clean !== null) {
                        onChange(clean);
                    }
                }}
                className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-28 rounded-md border px-3 font-mono text-sm outline-none focus-visible:ring-[3px]"
            />
        </div>
    );
}

/**
 * The kit's 8 fixed colours, and up to 12 of the site's own. A custom
 * colour keeps its key when it is renamed, so styles that use it
 * (`kit:<key>`) keep working.
 */
export function KitColors({
    kit,
    onChange,
}: {
    kit: Kit;
    onChange: (update: (kit: Kit) => Kit) => void;
}) {
    const t = useT();
    const setCustom = (index: number, color: KitColor) =>
        onChange((current) => ({
            ...current,
            custom_colors: current.custom_colors.map((entry, position) =>
                position === index ? color : entry,
            ),
        }));
    const isFull = kit.custom_colors.length >= MAX_CUSTOM_COLORS;

    return (
        <>
            <KitSection title={t('Colours')}>
                {KIT_COLOR_KEYS.map((key) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">
                            {t(KIT_COLOR_LABELS[key])}
                        </span>
                        <ColorField
                            label={t(KIT_COLOR_LABELS[key])}
                            value={kit.colors[key]}
                            onChange={(value) =>
                                onChange((current) => ({
                                    ...current,
                                    colors: { ...current.colors, [key]: value },
                                }))
                            }
                        />
                    </div>
                ))}
            </KitSection>

            <KitSection
                title={t('Extra colours')}
                hint={t('Up to :max. Styles can use them like the colours above.', {
                    max: MAX_CUSTOM_COLORS,
                })}
            >
                {kit.custom_colors.map((color, index) => (
                    <div key={color.key} className="grid gap-2 rounded-lg border p-2">
                        <div className="flex items-center gap-2">
                            <Input
                                value={color.label}
                                maxLength={40}
                                aria-label={t('Name of colour :number', {
                                    number: index + 1,
                                })}
                                className="bg-card h-10 min-w-0 flex-1"
                                onChange={(event) =>
                                    setCustom(index, { ...color, label: event.target.value })
                                }
                            />
                            <button
                                type="button"
                                aria-label={t('Remove :name', { name: color.label })}
                                title={t('Remove :name', { name: color.label })}
                                onClick={() =>
                                    onChange((current) => ({
                                        ...current,
                                        custom_colors: current.custom_colors.filter(
                                            (_, position) => position !== index,
                                        ),
                                    }))
                                }
                                className="text-destructive hover:bg-destructive/10 grid size-10 shrink-0 place-items-center rounded-md"
                            >
                                <Trash2 className="size-4" />
                            </button>
                        </div>
                        <ColorField
                            label={color.label}
                            value={color.value}
                            onChange={(value) => setCustom(index, { ...color, value })}
                        />
                    </div>
                ))}
                <button
                    type="button"
                    disabled={isFull}
                    onClick={() =>
                        onChange((current) => ({
                            ...current,
                            custom_colors: [
                                ...current.custom_colors,
                                {
                                    key: newCustomColorKey(current),
                                    label: t('New colour'),
                                    value: '#64748b',
                                },
                            ],
                        }))
                    }
                    className="bg-card text-muted-foreground flex h-10 items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm font-medium hover:border-[var(--builder-select)] hover:text-[var(--builder-select)] disabled:opacity-40"
                >
                    <Plus className="size-4" />
                    {t('Add colour')}
                </button>
            </KitSection>
        </>
    );
}
