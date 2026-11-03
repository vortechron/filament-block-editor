import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { type ReactNode, useId } from 'react';
import { Field, SwitchRow } from '@/editor/fields';
import { ImageField } from '@/editor/image-field';
import { LinkField } from '@/editor/link-field';
import { SegmentedChoice } from '@/editor/segmented-choice';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import type { OwnBlockDefinition, OwnBlockField } from '@/types';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import {
    emptyValue,
    type OwnValues,
    parseValues,
    serializeValues,
    valuesWithDefaults,
} from './own-block-values';

/** Up to this many choices show as buttons; more as a drop-down. */
const MAX_SEGMENTS = 3;

/**
 * The form for one own block, made from its definition's fields. It reads
 * the block's JSON values string and writes the whole object back as one
 * string on every change.
 */
export function OwnBlockForm({
    definition,
    values,
    onChange,
}: {
    definition: OwnBlockDefinition;
    /** The block's `values` prop: a JSON object string. */
    values: string;
    onChange: (values: string) => void;
}) {
    const current = valuesWithDefaults(definition, parseValues(values));

    return (
        <FieldList
            fields={definition.fields}
            values={current}
            onChange={(next) => onChange(serializeValues(next))}
        />
    );
}

function FieldList({
    fields,
    values,
    onChange,
}: {
    fields: OwnBlockField[];
    values: OwnValues;
    onChange: (values: OwnValues) => void;
}) {
    const { developer } = useHost();
    // Developer-only fields are left out of the form; their values stay.
    const shown = developer
        ? fields
        : fields.filter((field) => field.developerOnly !== true);

    return (
        <div className="grid grid-cols-1 gap-4">
            {shown.map((field) => (
                <OwnField
                    key={field.name}
                    field={field}
                    value={values[field.name]}
                    onChange={(value) =>
                        onChange({ ...values, [field.name]: value })
                    }
                />
            ))}
        </div>
    );
}

/** A field's label: its own, or its name made readable. */
export function fieldLabel(field: OwnBlockField): string {
    if (typeof field.label === 'string' && field.label !== '') {
        return field.label;
    }

    const words = field.name.replace(/[_-]+/g, ' ').trim();

    return words.charAt(0).toUpperCase() + words.slice(1);
}

function OwnField({
    field,
    value,
    onChange,
}: {
    field: OwnBlockField;
    value: unknown;
    onChange: (value: unknown) => void;
}) {
    const t = useT();
    const id = useId();
    const label = fieldLabel(field);
    const hint = typeof field.help === 'string' ? field.help : undefined;
    const text = typeof value === 'string' ? value : '';

    switch (field.type) {
        case 'textarea':
            return (
                <Field label={label} htmlFor={id} hint={hint}>
                    <Textarea
                        id={id}
                        value={text}
                        className="bg-card"
                        onChange={(event) => onChange(event.target.value)}
                    />
                </Field>
            );
        case 'select':
            return (
                <SelectField
                    id={id}
                    field={field}
                    label={label}
                    hint={hint}
                    value={text}
                    onChange={onChange}
                />
            );
        case 'toggle':
            return (
                <SwitchRow
                    label={label}
                    description={hint}
                    checked={value === true}
                    onCheckedChange={onChange}
                />
            );
        case 'number':
            return (
                <Field label={label} htmlFor={id} hint={hint}>
                    <Input
                        id={id}
                        type="number"
                        inputMode="decimal"
                        value={typeof value === 'number' ? String(value) : ''}
                        className="bg-card"
                        onChange={(event) => {
                            const typed = event.target.value.trim();
                            const number = Number(typed);

                            if (typed === '') {
                                onChange(null);
                            } else if (Number.isFinite(number)) {
                                onChange(number);
                            }
                        }}
                    />
                </Field>
            );
        case 'image':
            return (
                <ImageField
                    label={label}
                    hint={hint}
                    allowShopPictures
                    url={text === '' ? null : text}
                    onChange={onChange}
                />
            );
        case 'link':
            return (
                <LinkField label={label} hint={hint} value={text} onChange={onChange} />
            );
        case 'list':
            return (
                <ListField
                    field={field}
                    label={label}
                    hint={hint}
                    rows={Array.isArray(value) ? value : []}
                    onChange={onChange}
                />
            );
        default:
            return (
                <Field label={label} htmlFor={id} hint={hint}>
                    <Input
                        id={id}
                        value={text}
                        className="bg-card"
                        onChange={(event) => onChange(event.target.value)}
                    />
                </Field>
            );
    }
}

function SelectField({
    id,
    field,
    label,
    hint,
    value,
    onChange,
}: {
    id: string;
    field: OwnBlockField;
    label: string;
    hint?: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const options = field.options ?? [];

    if (options.length <= MAX_SEGMENTS) {
        return (
            <Group label={label} hint={hint}>
                <SegmentedChoice
                    label={label}
                    value={value}
                    options={options}
                    onChange={onChange}
                />
            </Group>
        );
    }

    return (
        <Field label={label} htmlFor={id} hint={hint}>
            <select
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </Field>
    );
}

/** Rows of the list's own fields, which can be added, moved and removed. */
function ListField({
    field,
    label,
    hint,
    rows,
    onChange,
}: {
    field: OwnBlockField;
    label: string;
    hint?: string;
    rows: unknown[];
    onChange: (rows: OwnValues[]) => void;
}) {
    const t = useT();
    const fields = field.fields ?? [];
    const max =
        typeof field.maxItems === 'number' && field.maxItems > 0
            ? field.maxItems
            : Number.POSITIVE_INFINITY;
    const values = rows.map((row) =>
        typeof row === 'object' && row !== null && !Array.isArray(row)
            ? (row as OwnValues)
            : {},
    );
    const newRow = (): OwnValues =>
        Object.fromEntries(fields.map((sub) => [sub.name, emptyValue(sub)]));
    const move = (index: number, offset: -1 | 1) => {
        const target = index + offset;
        const next = [...values];

        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    return (
        <Group label={label} hint={hint}>
            <div className="grid grid-cols-1 gap-2">
                {values.map((row, index) => (
                    <div
                        key={index}
                        className="bg-muted/40 grid gap-3 rounded-xl border p-3"
                    >
                        <div className="flex items-center gap-1">
                            <span className="text-muted-foreground flex-1 text-xs font-medium">
                                {t(':label :number', {
                                    label,
                                    number: index + 1,
                                })}
                            </span>
                            <RowButton
                                label={t('Move up')}
                                disabled={index === 0}
                                onClick={() => move(index, -1)}
                            >
                                <ArrowUp />
                            </RowButton>
                            <RowButton
                                label={t('Move down')}
                                disabled={index === values.length - 1}
                                onClick={() => move(index, 1)}
                            >
                                <ArrowDown />
                            </RowButton>
                            <RowButton
                                label={t('Remove')}
                                onClick={() =>
                                    onChange(
                                        values.filter(
                                            (_, position) => position !== index,
                                        ),
                                    )
                                }
                            >
                                <Trash2 />
                            </RowButton>
                        </div>
                        <FieldList
                            fields={fields}
                            values={{ ...newRow(), ...row }}
                            onChange={(next) =>
                                onChange(
                                    values.map((current, position) =>
                                        position === index ? next : current,
                                    ),
                                )
                            }
                        />
                    </div>
                ))}
                <button
                    type="button"
                    aria-label={t('Add to :label', { label })}
                    disabled={values.length >= max}
                    onClick={() => onChange([...values, newRow()])}
                    className="bg-card text-muted-foreground flex h-9 items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm font-medium hover:border-[var(--builder-select)] hover:text-[var(--builder-select)] disabled:opacity-40"
                >
                    <Plus className="size-4" />
                    {values.length >= max
                        ? t('Full at :max', { max })
                        : t('Add')}
                </button>
            </div>
        </Group>
    );
}

function RowButton({
    label,
    disabled,
    onClick,
    children,
}: {
    label: string;
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onClick}
            className="text-muted-foreground hover:bg-card hover:text-foreground grid size-7 place-items-center rounded-md disabled:opacity-35 [&_svg]:size-3.5"
        >
            {children}
        </button>
    );
}

function Group({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <p className="text-foreground text-sm font-medium">{label}</p>
            {children}
            {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        </div>
    );
}
