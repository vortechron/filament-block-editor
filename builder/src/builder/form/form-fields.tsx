import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import {
    fieldNameFrom,
    type FormField,
    MAX_FIELDS,
    newFieldId,
    uniqueName,
} from '@/lib/form-definition';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { moveItem, replaceItem } from '../../editor/helpers';
import { FIELD_TYPE_LABELS, FormFieldEditor } from './form-field-editor';

/**
 * The form's fields in order. Tap one to open it; move, remove or add
 * fields. A new field opens at once.
 */
export function FormFields({
    fields,
    onChange,
}: {
    fields: FormField[];
    onChange: (fields: FormField[]) => void;
}) {
    const t = useT();
    const [openId, setOpenId] = useState<string | null>(null);

    function addField() {
        const label = t('New field');
        const field: FormField = {
            id: newFieldId(),
            type: 'text',
            name: uniqueName(
                fieldNameFrom(label),
                new Set(fields.map((entry) => entry.name)),
            ),
            label,
            placeholder: '',
            required: false,
            width: 'full',
        };

        onChange([...fields, field]);
        setOpenId(field.id);
    }

    function changeField(index: number, next: FormField) {
        onChange(replaceItem(fields, index, withAutoName(fields, index, next)));
    }

    return (
        <div className="grid grid-cols-1 gap-2">
            {fields.map((field, index) => {
                const number = index + 1;
                const isOpen = openId === field.id;

                return (
                    <div key={field.id} className="bg-card rounded-xl border">
                        <div className="flex items-center gap-1 p-1 pl-1">
                            <button
                                type="button"
                                aria-expanded={isOpen}
                                aria-label={t('Field :number: :label', {
                                    number,
                                    label: field.label || t('No label'),
                                })}
                                onClick={() => setOpenId(isOpen ? null : field.id)}
                                className="hover:bg-muted flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left"
                            >
                                <ChevronDown
                                    className={cn(
                                        'text-muted-foreground size-4 shrink-0 transition-transform',
                                        !isOpen && '-rotate-90',
                                    )}
                                />
                                <span className="min-w-0">
                                    <span className="text-foreground block truncate text-sm font-medium">
                                        {field.label || t('No label')}
                                        {field.required && ' *'}
                                    </span>
                                    <span className="text-muted-foreground block truncate text-xs">
                                        {t(FIELD_TYPE_LABELS[field.type])}
                                        {field.width === 'half' && ` · ${t('Half')}`}
                                    </span>
                                </span>
                            </button>
                            <RowButton
                                label={t('Move up')}
                                disabled={index === 0}
                                onClick={() => onChange(moveItem(fields, index, -1))}
                            >
                                <ArrowUp />
                            </RowButton>
                            <RowButton
                                label={t('Move down')}
                                disabled={index === fields.length - 1}
                                onClick={() => onChange(moveItem(fields, index, 1))}
                            >
                                <ArrowDown />
                            </RowButton>
                            <RowButton
                                label={t('Remove field :number', { number })}
                                onClick={() =>
                                    onChange(fields.filter((_, at) => at !== index))
                                }
                            >
                                <Trash2 />
                            </RowButton>
                        </div>
                        {isOpen && (
                            <div className="border-t p-3">
                                <FormFieldEditor
                                    field={field}
                                    number={number}
                                    onChange={(next) => changeField(index, next)}
                                />
                            </div>
                        )}
                    </div>
                );
            })}

            <button
                type="button"
                disabled={fields.length >= MAX_FIELDS}
                onClick={addField}
                className="bg-card text-muted-foreground flex h-9 items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm font-medium hover:border-[var(--builder-select)] hover:text-[var(--builder-select)] disabled:opacity-40"
            >
                <Plus className="size-4" />
                {fields.length >= MAX_FIELDS
                    ? t('Full at :max', { max: MAX_FIELDS })
                    : t('Add field')}
            </button>
        </div>
    );
}

/**
 * A name made from the label follows the label: when the label changes and
 * the name was still the one made from the old label, it is made again.
 */
function withAutoName(
    fields: readonly FormField[],
    index: number,
    next: FormField,
): FormField {
    const before = fields[index];

    if (before.label === next.label || before.name !== next.name) {
        return next;
    }

    const others = new Set(
        fields.filter((_, at) => at !== index).map((field) => field.name),
    );
    const wasAuto =
        before.name === uniqueName(fieldNameFrom(before.label), others);

    return wasAuto
        ? { ...next, name: uniqueName(fieldNameFrom(next.label), others) }
        : next;
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
            className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-8 shrink-0 place-items-center rounded-md disabled:opacity-35 [&_svg]:size-3.5"
        >
            {children}
        </button>
    );
}
