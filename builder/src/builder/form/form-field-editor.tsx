import { type ReactNode, useId } from 'react';
import { SwitchRow } from '@/editor/fields';
import { SegmentedChoice } from '@/editor/segmented-choice';
import {
    CHOICE_TYPES,
    FORM_FIELD_TYPES,
    type FormField,
    type FormFieldType,
    LABEL_LENGTH,
    MAX_ROWS,
    MIN_ROWS,
    PLACEHOLDER_TYPES,
    typeFieldName,
} from '@/lib/form-definition';
import { useT } from '@/lib/i18n';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { useDraft } from './use-draft';

/** Each field type's name, in English for t(). */
export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
    text: 'Short text',
    email: 'Email',
    tel: 'Phone',
    number: 'Number',
    date: 'Date',
    textarea: 'Long text',
    select: 'Drop-down',
    radio: 'Pick one',
    checkboxes: 'Pick several',
    consent: 'Agree box',
};

/**
 * One field of the form, opened: its type, label, name, hint, whether it
 * must be filled in, its width, and its choices or rows.
 */
export function FormFieldEditor({
    field,
    number,
    onChange,
}: {
    field: FormField;
    /** Its place in the form, from 1, for the labels. */
    number: number;
    onChange: (field: FormField) => void;
}) {
    const t = useT();
    const id = useId();
    const ids = {
        type: `${id}-type`,
        label: `${id}-label`,
        name: `${id}-name`,
        hint: `${id}-hint`,
        choices: `${id}-choices`,
        rows: `${id}-rows`,
    };
    const set = (patch: Partial<FormField>) => onChange({ ...field, ...patch });
    const name = useDraft({
        value: field.name,
        format: (value) => value,
        parse: (text) => {
            const typed = typeFieldName(text);

            return typed === '' ? null : typed;
        },
        commit: (value) => set({ name: value }),
    });
    const choices = useDraft({
        value: field.options ?? [],
        format: (options) => options.join('\n'),
        parse: (text) =>
            text
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line !== ''),
        commit: (options) => set({ options }),
    });

    return (
        <div className="grid grid-cols-1 gap-3">
            <Row label={t('Type')} htmlFor={ids.type}>
                <select
                    id={ids.type}
                    aria-label={t('Type of field :number', { number })}
                    value={field.type}
                    onChange={(event) =>
                        set({ type: event.target.value as FormFieldType })
                    }
                    className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
                >
                    {FORM_FIELD_TYPES.map((type) => (
                        <option key={type} value={type}>
                            {t(FIELD_TYPE_LABELS[type])}
                        </option>
                    ))}
                </select>
            </Row>

            <Row label={t('Label')} htmlFor={ids.label}>
                {field.type === 'consent' ? (
                    <Textarea
                        id={ids.label}
                        aria-label={t('Label of field :number', { number })}
                        value={field.label}
                        maxLength={LABEL_LENGTH}
                        rows={2}
                        className="bg-card"
                        onChange={(event) => set({ label: event.target.value })}
                    />
                ) : (
                    <Input
                        id={ids.label}
                        aria-label={t('Label of field :number', { number })}
                        value={field.label}
                        maxLength={LABEL_LENGTH}
                        className="bg-card"
                        onChange={(event) => set({ label: event.target.value })}
                    />
                )}
            </Row>

            <Row
                label={t('Name')}
                htmlFor={ids.name}
                hint={t('Made from the label. A WhatsApp message shows the answer with {:name}.', {
                    name: field.name,
                })}
            >
                <Input
                    id={ids.name}
                    aria-label={t('Name of field :number', { number })}
                    value={name.text}
                    className="bg-card font-mono text-xs"
                    onChange={(event) => name.setText(event.target.value)}
                />
            </Row>

            {PLACEHOLDER_TYPES.includes(field.type) && (
                <Row label={t('Hint inside the box')} htmlFor={ids.hint}>
                    <Input
                        id={ids.hint}
                        value={field.placeholder ?? ''}
                        maxLength={LABEL_LENGTH}
                        className="bg-card"
                        onChange={(event) => set({ placeholder: event.target.value })}
                    />
                </Row>
            )}

            {CHOICE_TYPES.includes(field.type) && (
                <Row label={t('Choices')} htmlFor={ids.choices} hint={t('One choice on each line.')}>
                    <Textarea
                        id={ids.choices}
                        aria-label={t('Choices of field :number', { number })}
                        value={choices.text}
                        rows={4}
                        className="bg-card"
                        onChange={(event) => choices.setText(event.target.value)}
                    />
                </Row>
            )}

            {field.type === 'textarea' && (
                <Row label={t('Lines')} htmlFor={ids.rows}>
                    <Input
                        id={ids.rows}
                        type="number"
                        inputMode="numeric"
                        min={MIN_ROWS}
                        max={MAX_ROWS}
                        value={String(field.rows ?? 4)}
                        className="bg-card"
                        onChange={(event) => {
                            const rows = Number(event.target.value);

                            if (Number.isFinite(rows) && event.target.value !== '') {
                                set({ rows });
                            }
                        }}
                    />
                </Row>
            )}

            <SwitchRow
                label={t('Must be filled in')}
                checked={field.required}
                onCheckedChange={(required) => set({ required })}
            />

            <div className="grid gap-2">
                <p className="text-foreground text-sm font-medium">{t('Width')}</p>
                <SegmentedChoice
                    label={t('Width')}
                    value={field.width}
                    options={[
                        { value: 'full', label: t('Full') },
                        { value: 'half', label: t('Half') },
                    ]}
                    onChange={(width) => set({ width: width === 'half' ? 'half' : 'full' })}
                />
            </div>
        </div>
    );
}

function Row({
    label,
    htmlFor,
    hint,
    children,
}: {
    label: string;
    htmlFor: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-1.5">
            <label htmlFor={htmlFor} className="text-foreground text-xs font-medium">
                {label}
            </label>
            {children}
            {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        </div>
    );
}
