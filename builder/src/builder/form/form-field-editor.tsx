import { LocalizedText } from '../field-language';
import { useHost } from '@/lib/host';
import { type ReactNode, useId } from 'react';
import { SwitchRow } from '@/editor/fields';
import { SegmentedChoice } from '@/editor/segmented-choice';
import {
    CHOICE_TYPES,
    DEFAULT_ROWS,
    FORM_FIELD_TYPES,
    type FormField,
    type FormFieldType,
    LABEL_LENGTH,
    MAX_ROWS,
    MIN_ROWS,
    PLACEHOLDER_LENGTH,
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

type FieldProps = {
    field: FormField;
    /** Its place in the form, from 1, for the labels. */
    number: number;
    set: (patch: Partial<FormField>) => void;
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
    const set = (patch: Partial<FormField>) => onChange({ ...field, ...patch });
    const props = { field, number, set };

    return (
        <div className="grid grid-cols-1 gap-3">
            <TypeRow {...props} />
            <LabelRow {...props} />
            <NameRow {...props} />
            {PLACEHOLDER_TYPES.includes(field.type) && <HintRow {...props} />}
            {CHOICE_TYPES.includes(field.type) && <ChoicesRow {...props} />}
            {field.type === 'textarea' && <RowsRow {...props} />}

            <SwitchRow
                label={t('Must be filled in')}
                checked={field.required}
                onCheckedChange={(required) => set({ required })}
            />

            <div className="grid gap-2">
                <p className="text-foreground text-sm font-medium">
                    {t('Width')}
                </p>
                <SegmentedChoice
                    label={t('Width')}
                    value={field.width}
                    options={[
                        { value: 'full', label: t('Full') },
                        { value: 'half', label: t('Half') },
                    ]}
                    onChange={(width) =>
                        set({ width: width === 'half' ? 'half' : 'full' })
                    }
                />
            </div>
        </div>
    );
}

function TypeRow({ field, number, set }: FieldProps) {
    const t = useT();
    const id = useId();

    return (
        <Row label={t('Type')} htmlFor={id}>
            <select
                id={id}
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
    );
}

/** A consent field's label is a sentence, so it gets a bigger box. */
function LabelRow({ field, number, set }: FieldProps) {
    const t = useT();
    const id = useId();
    const shared = {
        id,
        'aria-label': t('Label of field :number', { number }),
        value: field.label,
        maxLength: LABEL_LENGTH,
        className: 'bg-card',
    };

    return (
        <Row label={t('Label')} htmlFor={id}>
            <LocalizedText
                path={`/field:${field.id}/label`}
                label={t('Label')}
                value={field.label}
                onChange={(label) => set({ label })}
            >
                {(value, change) =>
                    field.type === 'consent' ? (
                        <Textarea
                            {...shared}
                            value={value}
                            rows={2}
                            onChange={(event) => change(event.target.value)}
                        />
                    ) : (
                        <Input
                            {...shared}
                            value={value}
                            onChange={(event) => change(event.target.value)}
                        />
                    )
                }
            </LocalizedText>
        </Row>
    );
}

function NameRow({ field, number, set }: FieldProps) {
    const t = useT();
    const id = useId();
    const name = useDraft({
        value: field.name,
        format: (value) => value,
        parse: (text) => {
            const typed = typeFieldName(text);

            return typed === '' ? null : typed;
        },
        commit: (value) => set({ name: value }),
    });

    return (
        <Row
            label={t('Name')}
            htmlFor={id}
            hint={t(
                'Made from the label. A WhatsApp message shows the answer with {:name}.',
                {
                    name: field.name,
                },
            )}
        >
            <Input
                id={id}
                aria-label={t('Name of field :number', { number })}
                value={name.text}
                className="bg-card font-mono text-xs"
                onChange={(event) => name.setText(event.target.value)}
            />
        </Row>
    );
}

function HintRow({ field, set }: FieldProps) {
    const t = useT();
    const id = useId();

    return (
        <Row label={t('Hint inside the box')} htmlFor={id}>
            <LocalizedText
                path={`/field:${field.id}/placeholder`}
                label={t('Hint inside the box')}
                value={field.placeholder ?? ''}
                onChange={(placeholder) => set({ placeholder })}
            >
                {(value, change) => (
                    <Input
                        id={id}
                        value={value}
                        maxLength={PLACEHOLDER_LENGTH}
                        className="bg-card"
                        onChange={(event) => change(event.target.value)}
                    />
                )}
            </LocalizedText>
        </Row>
    );
}

function ChoicesRow({ field, number, set }: FieldProps) {
    const { fieldLanguages } = useHost();
    const t = useT();
    const id = useId();
    const choices = useDraft({
        value: field.options ?? [],
        format: (options) => options.join('\n'),
        parse: (text) =>
            text
                .split('\n')
                .map((line) => line.trim())
                .filter(
                    (line) => field.option_ids !== undefined || line !== '',
                ),
        commit: (options) => {
            const previous = field.options ?? [];
            const reserved = new Set<number>();
            // An unchanged line keeps its identity before a moved duplicate
            // can claim it. Then reserve moved survivors before rename fallback.
            const matches = options.map((option, index) => {
                if (previous[index] === option) {
                    reserved.add(index);
                    return index;
                }
                return -1;
            });
            options.forEach((option, position) => {
                if (matches[position] >= 0) return;
                const index = previous.findIndex(
                    (old, i) => old === option && !reserved.has(i),
                );
                if (index >= 0) reserved.add(index);
                matches[position] = index;
            });
            const option_ids = options.map((_, i) => {
                const matched = matches[i];
                const renamed =
                    matched < 0 && i < previous.length && !reserved.has(i)
                        ? i
                        : -1;
                const index = matched >= 0 ? matched : renamed;
                if (index >= 0) reserved.add(index);
                return (
                    (index >= 0 ? field.option_ids?.[index] : undefined) ??
                    `o${Math.random().toString(36).slice(2, 10)}`
                );
            });
            set({ options, option_ids });
        },
    });

    return (
        <div className="grid gap-2">
            {fieldLanguages &&
                (field.options ?? []).map((option, i) => (
                    <LocalizedText
                        key={field.option_ids?.[i] ?? i}
                        path={`/field:${field.id}/option:${field.option_ids?.[i]}`}
                        label={`${t('Choice')} ${i + 1}`}
                        value={option}
                        onChange={(value) =>
                            set({
                                options: field.options?.map((old, j) =>
                                    i === j ? value : old,
                                ),
                            })
                        }
                    >
                        {(value, change) => (
                            <Input
                                aria-label={`${t('Choice')} ${i + 1}`}
                                value={value}
                                onChange={(event) => change(event.target.value)}
                            />
                        )}
                    </LocalizedText>
                ))}
            <Row
                label={t('Choices')}
                htmlFor={id}
                hint={t('One choice on each line.')}
            >
                <Textarea
                    id={id}
                    aria-label={t('Choices of field :number', { number })}
                    value={choices.text}
                    rows={4}
                    className="bg-card"
                    onChange={(event) => choices.setText(event.target.value)}
                />
            </Row>
        </div>
    );
}

function RowsRow({ field, set }: FieldProps) {
    const t = useT();
    const id = useId();

    return (
        <Row label={t('Lines')} htmlFor={id}>
            <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={MIN_ROWS}
                max={MAX_ROWS}
                value={String(field.rows ?? DEFAULT_ROWS)}
                className="bg-card"
                onChange={(event) => {
                    const rows = Number(event.target.value);

                    if (Number.isFinite(rows) && event.target.value !== '') {
                        set({ rows });
                    }
                }}
            />
        </Row>
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
            <label
                htmlFor={htmlFor}
                className="text-foreground text-xs font-medium"
            >
                {label}
            </label>
            {children}
            {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        </div>
    );
}
