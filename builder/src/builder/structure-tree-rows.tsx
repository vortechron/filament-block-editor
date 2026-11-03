import { PanelBottom, PanelTop } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { partLabel } from '@/lib/site-parts';
import { cn } from '@/lib/utils';
import type { PartKey } from '@/types';
import type { ItemNode } from './structure-tree';

/**
 * The lines of the Structure tab that are not sections: the header and
 * footer at the ends, and a section's items under it.
 */

/** The header or the footer. Tapping it opens its panel. */
export function PartLine({
    part,
    title,
    isSelected,
    onPick,
}: {
    part: PartKey;
    title: string;
    isSelected: boolean;
    onPick: () => void;
}) {
    const t = useT();
    const Icon = part === 'header' ? PanelTop : PanelBottom;
    const name = partLabel(part, t);

    return (
        <button
            type="button"
            onClick={onPick}
            aria-current={isSelected ? 'true' : undefined}
            className={cn(
                'bg-card flex items-center gap-2.5 rounded-xl border border-dashed p-1 pr-2 text-left transition-[border-color,box-shadow]',
                isSelected
                    ? 'border-solid border-[var(--builder-select)] shadow-[0_0_0_1px_var(--builder-select)]'
                    : 'hover:border-input',
            )}
        >
            <span
                className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-lg',
                    isSelected
                        ? 'bg-[var(--builder-select)] text-white'
                        : 'bg-muted text-muted-foreground',
                )}
            >
                <Icon className="size-4" />
            </span>
            <span className="min-w-0">
                <span className="text-foreground block truncate text-sm font-medium">
                    {title || name}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                    {name}
                </span>
            </span>
        </button>
    );
}

/**
 * A section's items, indented one step for each level. Items in columns
 * and cards are one step deeper. They cannot be dragged here.
 */
export function ItemTree({
    items,
    pickedItemId,
    onPick,
}: {
    items: readonly ItemNode[];
    pickedItemId: string | null;
    onPick: (itemId: string) => void;
}) {
    return (
        <ul
            role="group"
            className="border-border/70 mt-1 ml-5 grid grid-cols-1 gap-0.5 border-l pl-2"
        >
            {items.map((item) => (
                <ItemLine
                    key={item.id}
                    item={item}
                    pickedItemId={pickedItemId}
                    onPick={onPick}
                />
            ))}
        </ul>
    );
}

function ItemLine({
    item,
    pickedItemId,
    onPick,
}: {
    item: ItemNode;
    pickedItemId: string | null;
    onPick: (itemId: string) => void;
}) {
    const t = useT();
    const Icon = item.icon;
    const isPicked = pickedItemId === item.id;
    const label = item.isOwn ? item.label : t(item.label, item.labelParams);

    return (
        <li>
            <button
                type="button"
                onClick={() => onPick(item.id)}
                aria-current={isPicked ? 'true' : undefined}
                className={cn(
                    'flex h-8 w-full items-center gap-2 rounded-lg border px-1.5 text-left text-xs transition-colors',
                    isPicked
                        ? 'border-[var(--builder-select)] bg-[var(--builder-select)]/10 shadow-[0_0_0_1px_var(--builder-select)]'
                        : 'hover:bg-muted border-transparent',
                )}
            >
                <Icon
                    className={cn(
                        'size-3.5 shrink-0',
                        isPicked
                            ? 'text-[var(--builder-select)]'
                            : 'text-muted-foreground',
                    )}
                />
                <span className="text-foreground shrink-0 font-medium">
                    {label}
                </span>
                {item.detail && (
                    <span className="text-muted-foreground min-w-0 truncate">
                        {item.detail}
                    </span>
                )}
            </button>
            {item.children.length > 0 && (
                <ItemTree
                    items={item.children}
                    pickedItemId={pickedItemId}
                    onPick={onPick}
                />
            )}
        </li>
    );
}
