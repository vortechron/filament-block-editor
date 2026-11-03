import { Search, Store } from 'lucide-react';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import {
    dynamicValuesOfType,
    filterDynamicValues,
    groupDynamicValues,
} from '@/lib/dynamic-values';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { DynamicValueDefinition } from '@/types';

/**
 * A button that opens a search over the site's own values of one type,
 * like the shop's phone, its WhatsApp link or its logo: a search box and
 * the values by group, each with what it is now. Arrow keys move, Enter or
 * a tap picks, Escape closes. It hands back the value's key; the field
 * decides how to store it (`@key` in a link or a picture, a `{key}` chip in
 * words). Nothing shows when the site has no value of that type.
 */
export function DynamicValuePicker({
    type,
    label,
    onPick,
}: {
    type: DynamicValueDefinition['type'];
    /** The button's text, already translated, like "Shop links". */
    label: string;
    onPick: (key: string) => void;
}) {
    const { dynamicValues } = useHost();
    const values = dynamicValuesOfType(dynamicValues, type);
    const [isOpen, setIsOpen] = useState(false);
    const button = useRef<HTMLButtonElement>(null);
    const root = useRef<HTMLDivElement>(null);
    const panelId = useId();

    // A tap anywhere else closes it.
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function closeOutside(event: PointerEvent) {
            if (event.target instanceof Node && !root.current?.contains(event.target)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('pointerdown', closeOutside);

        return () => document.removeEventListener('pointerdown', closeOutside);
    }, [isOpen]);

    if (values.length === 0) {
        return null;
    }

    function close() {
        setIsOpen(false);
        button.current?.focus();
    }

    return (
        <div ref={root} className="relative shrink-0">
            <button
                ref={button}
                type="button"
                aria-expanded={isOpen}
                aria-controls={isOpen ? panelId : undefined}
                onClick={() => setIsOpen((open) => !open)}
                className={cn(
                    'text-muted-foreground hover:text-foreground hover:bg-muted inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium',
                    isOpen && 'bg-muted text-foreground',
                )}
            >
                <Store className="size-3.5" />
                {label}
            </button>
            {isOpen && (
                <SearchPanel
                    id={panelId}
                    label={label}
                    values={values}
                    onPick={(key) => {
                        close();
                        onPick(key);
                    }}
                    onClose={close}
                />
            )}
        </div>
    );
}

function SearchPanel({
    id,
    label,
    values,
    onPick,
    onClose,
}: {
    id: string;
    label: string;
    values: DynamicValueDefinition[];
    onPick: (key: string) => void;
    onClose: () => void;
}) {
    const t = useT();
    const listId = useId();
    const optionId = useId();
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const groups = groupDynamicValues(filterDynamicValues(values, query));
    // In the order they show, group by group, for the arrow keys.
    const found = groups.flatMap((group) => group.values);
    const activeKey = found[Math.min(active, found.length - 1)]?.key;
    const idOf = (key: string) => `${optionId}-${key}`;

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();

            const step = event.key === 'ArrowDown' ? 1 : -1;

            setActive((current) => Math.max(0, Math.min(found.length - 1, current + step)));
        } else if (event.key === 'Enter') {
            event.preventDefault();

            if (activeKey !== undefined) {
                onPick(activeKey);
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
        }
    }

    return (
        <div
            id={id}
            className="bg-popover text-popover-foreground absolute top-full right-0 z-50 mt-1 grid w-[min(18rem,calc(100vw-2rem))] gap-1 rounded-lg border p-1.5 shadow-lg"
        >
            <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <input
                    role="combobox"
                    aria-label={t('Search shop values')}
                    aria-expanded="true"
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={activeKey === undefined ? undefined : idOf(activeKey)}
                    autoFocus
                    value={query}
                    placeholder={t('Search')}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setActive(0);
                    }}
                    onKeyDown={handleKeyDown}
                    className="border-input bg-card focus-visible:border-ring h-10 w-full rounded-md border pr-2 pl-8 text-sm outline-none"
                />
            </div>
            <div
                id={listId}
                role="listbox"
                aria-label={label}
                className="max-h-64 overflow-y-auto overscroll-contain"
            >
                {groups.map((group) => (
                    <div key={group.group} role="group" aria-label={group.group || label} className="py-0.5">
                        {group.group !== '' && (
                            <p className="text-muted-foreground px-2 pt-1.5 pb-0.5 text-[11px] font-semibold tracking-wide uppercase">
                                {group.group}
                            </p>
                        )}
                        {group.values.map((value) => (
                            <div
                                key={value.key}
                                id={idOf(value.key)}
                                role="option"
                                aria-selected={value.key === activeKey}
                                onPointerDown={(event) => event.preventDefault()}
                                onPointerEnter={() => setActive(found.indexOf(value))}
                                onClick={() => onPick(value.key)}
                                className={cn(
                                    'grid min-h-11 cursor-pointer content-center gap-0.5 rounded-md px-2 py-1.5',
                                    value.key === activeKey && 'bg-accent text-accent-foreground',
                                )}
                            >
                                <span className="text-sm">{value.label}</span>
                                {value.preview && (
                                    <span className="text-muted-foreground truncate text-xs">{value.preview}</span>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
                {found.length === 0 && (
                    <p className="text-muted-foreground px-2 py-3 text-center text-sm">
                        {t('Nothing matches your search.')}
                    </p>
                )}
            </div>
        </div>
    );
}
