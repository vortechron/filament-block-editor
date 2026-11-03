import { useEffect, useId, useState } from 'react';
import { Field, SwitchRow } from '@/editor/fields';
import {
    cleanAdvanced,
    cleanClassNames,
    cleanCustomCss,
    MAX_CSS_LENGTH,
} from '@/lib/advanced';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import type { Advanced, StyleDevice } from '@/types';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';

const HIDE_ON: { device: StyleDevice; label: string; hint: string }[] = [
    { device: 'desktop', label: 'Hide on laptops', hint: 'Screens 1025px wide and up.' },
    { device: 'tablet', label: 'Hide on tablets', hint: 'Screens 768px to 1024px wide.' },
    { device: 'phone', label: 'Hide on phones', hint: 'Screens up to 767px wide.' },
];

/**
 * The "Advanced" tab of a section or an item: extra class names, the
 * devices to hide it on, and custom CSS, which only developers see. A
 * value the server would drop is kept in the field with a note, and not
 * written.
 */
export function AdvancedFields({
    advanced,
    onChange,
}: {
    advanced: Advanced | null | undefined;
    /** The whole part after a change, or null when it is empty. */
    onChange: (advanced: Advanced | null) => void;
}) {
    const t = useT();
    const { developer } = useHost();
    const current = advanced ?? {};
    const hideOn = current.hide_on ?? [];
    const write = (next: Advanced) => onChange(cleanAdvanced(next));

    return (
        <div className="grid grid-cols-1 gap-5">
            <ClassNamesField
                value={current.class ?? null}
                onChange={(className) => write({ ...current, class: className })}
            />

            <div className="grid gap-3">
                {HIDE_ON.map(({ device, label, hint }) => (
                    <SwitchRow
                        key={device}
                        label={t(label)}
                        description={t(hint)}
                        checked={hideOn.includes(device)}
                        onCheckedChange={(on) =>
                            write({
                                ...current,
                                hide_on: on
                                    ? [...hideOn, device]
                                    : hideOn.filter((item) => item !== device),
                            })
                        }
                    />
                ))}
            </div>

            {developer && (
                <CustomCssField
                    value={current.css ?? null}
                    onChange={(css) => write({ ...current, css })}
                />
            )}
        </div>
    );
}

/** Text typed here, kept while it is being typed, and what it cleans to. */
function useTyped(value: string | null, clean: (text: string) => string | null) {
    const [text, setText] = useState(value ?? '');

    useEffect(() => {
        setText((typed) => (clean(typed) === value ? typed : (value ?? '')));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return [text, setText] as const;
}

function ClassNamesField({
    value,
    onChange,
}: {
    value: string | null;
    onChange: (value: string | null) => void;
}) {
    const t = useT();
    const id = useId();
    const [text, setText] = useTyped(value, cleanClassNames);
    const kept = cleanClassNames(text) ?? '';
    const isPartly = text.trim() !== '' && kept !== text.trim().split(/\s+/).join(' ');

    return (
        <Field
            label={t('Class names')}
            htmlFor={id}
            hint={t('Up to 5 names, split by spaces, like price-card wide.')}
            error={
                isPartly
                    ? t('Only these are kept: :names', { names: kept || '—' })
                    : undefined
            }
        >
            <Input
                id={id}
                value={text}
                autoComplete="off"
                spellCheck={false}
                className="bg-card font-mono"
                onChange={(event) => {
                    setText(event.target.value);
                    onChange(cleanClassNames(event.target.value));
                }}
            />
        </Field>
    );
}

function CustomCssField({
    value,
    onChange,
}: {
    value: string | null;
    onChange: (value: string | null) => void;
}) {
    const t = useT();
    const id = useId();
    const [text, setText] = useTyped(value, cleanCustomCss);
    const isRefused = text.trim() !== '' && cleanCustomCss(text) === null;

    return (
        <Field
            label={t('Custom CSS')}
            htmlFor={id}
            hint={t(
                'Only developers see this. Write selector for this element, like: selector .bn-button { letter-spacing: .1em; }',
            )}
            error={
                isRefused
                    ? t(
                          'This CSS is not saved. It may not hold <, @import, expression(, javascript: or behavior:, and url() must start with https:// or /.',
                      )
                    : undefined
            }
        >
            <Textarea
                id={id}
                value={text}
                rows={6}
                maxLength={MAX_CSS_LENGTH}
                spellCheck={false}
                placeholder="selector { }"
                className="bg-card min-h-32 font-mono text-xs"
                onChange={(event) => {
                    setText(event.target.value);
                    onChange(cleanCustomCss(event.target.value));
                }}
            />
        </Field>
    );
}
