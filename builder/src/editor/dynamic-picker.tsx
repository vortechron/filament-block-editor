import { ChevronDown, Store, X } from 'lucide-react';
import {
    dynamicRef,
    dynamicRefKey,
    dynamicValuesOfType,
    findDynamicValue,
} from '@/lib/dynamic-values';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import type { DynamicValueDefinition } from '@/types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';

type PickerType = Extract<DynamicValueDefinition['type'], 'link' | 'image'>;

/**
 * A small menu of the site's own links or pictures, like the shop's
 * WhatsApp or its logo. Picking one stores `@key`; the site fills in the
 * real value when the page is drawn. Nothing shows when the site has none.
 */
export function DynamicPicker({
    type,
    onPick,
}: {
    type: PickerType;
    onPick: (value: string) => void;
}) {
    const t = useT();
    const { dynamicValues } = useHost();
    const values = dynamicValuesOfType(dynamicValues, type);

    if (values.length === 0) {
        return null;
    }

    const label = type === 'link' ? t('Shop links') : t('Shop pictures');

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium"
                >
                    <Store className="size-3.5" />
                    {label}
                    <ChevronDown className="size-3" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                {values.map((value) => (
                    <DropdownMenuItem
                        key={value.key}
                        onSelect={() => onPick(dynamicRef(value.key))}
                        className="grid gap-0.5"
                    >
                        <span className="text-sm">{value.label}</span>
                        {value.preview && (
                            <span className="text-muted-foreground truncate text-xs">
                                {value.preview}
                            </span>
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

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
