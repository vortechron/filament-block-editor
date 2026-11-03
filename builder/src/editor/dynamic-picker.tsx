import { Store, X } from 'lucide-react';
import { dynamicRefKey, findDynamicValue } from '@/lib/dynamic-values';
import { useHost } from '@/lib/host';

/**
 * A link or a picture stored as one of the site's own values (`@key`, picked
 * with DynamicValuePicker), shown by its label instead of as text.
 */

/** Is the value a stored `@key`? Then it shows as its label, not as text. */
export function isDynamicRef(value: unknown): boolean {
    return dynamicRefKey(value) !== null;
}

/**
 * A stored `@key`, shown by its label (or the key, when the site no longer
 * has it), with a button to take it out again.
 */
export function DynamicRefChip({
    label,
    value,
    clearLabel,
    onClear,
}: {
    /** The field's own label, which names the group. */
    label: string;
    value: string;
    clearLabel: string;
    onClear: () => void;
}) {
    const { dynamicValues } = useHost();
    const key = dynamicRefKey(value) ?? value;
    const definition = findDynamicValue(dynamicValues, key);

    return (
        <div
            role="group"
            aria-label={label}
            className="flex min-h-9 items-center gap-2 rounded-md border border-sky-200 bg-sky-50 py-1 pr-1 pl-2.5 text-sky-950"
        >
            <Store className="size-4 shrink-0 text-sky-700" />
            <span className="grid min-w-0 flex-1">
                <span className="truncate text-sm font-medium">
                    {definition?.label ?? key}
                </span>
                {definition?.preview && (
                    <span className="truncate text-xs text-sky-800/80">
                        {definition.preview}
                    </span>
                )}
            </span>
            <button
                type="button"
                aria-label={clearLabel}
                title={clearLabel}
                onClick={onClear}
                className="grid size-7 shrink-0 place-items-center rounded-md text-sky-800 hover:bg-sky-100"
            >
                <X className="size-3.5" />
            </button>
        </div>
    );
}
