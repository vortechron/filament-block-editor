import { ArrowDown, ArrowUp, CopyPlus, PencilLine, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { isLocked } from '@/lib/locks';
import { ActionButton } from './action-button';
import { useBuilderContext } from './builder-context';
import { describeBlock } from './item-catalog';
import { ItemSettings } from './item-settings';
import { ItemTabs } from './item-tabs';
import { Skeleton } from '@/ui/skeleton';
import type { ItemSnapshot, SectionEditorHandle } from './types';

/** The item's props again after every change, for the fields below. */
function readItem(
    handle: SectionEditorHandle | null,
    itemId: string,
    _version: number,
): ItemSnapshot | null {
    return handle?.getItem(itemId) ?? null;
}

/**
 * The picked item: its own settings (item-settings.tsx), its style and
 * advanced tabs, and buttons to move, copy or delete it. Every change goes
 * into the section's editor, and the page shows it a moment later.
 */
export function ItemPanel() {
    const t = useT();
    const { builder } = useBuilderContext();
    const { ownBlocks, developer } = useHost();
    const { sectionId, itemId } = builder.selection;
    const handle = builder.handleFor(sectionId);
    const [version, setVersion] = useState(0);

    useEffect(
        () => handle?.subscribe(() => setVersion((value) => value + 1)),
        [handle],
    );

    const item = itemId ? readItem(handle, itemId, version) : null;

    // The section's editor opens a moment after the section is picked.
    if (sectionId && itemId && !handle) {
        return <Skeleton className="h-16 w-full rounded-xl" />;
    }

    if (!handle || !item || !sectionId) {
        return (
            <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
                {t('This item is no longer on the page.')}
            </p>
        );
    }

    const { label, icon: Icon, isOwn } = describeBlock(
        item.type,
        item.props,
        ownBlocks,
    );
    const update = (props: Record<string, unknown>) =>
        handle.updateItem(item.id, props);

    return (
        <div className="grid grid-cols-1 gap-5">
            <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--builder-select)] text-white shadow-sm">
                    <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                    <p className="text-foreground text-sm font-semibold">
                        {isOwn ? label : t(label)}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                        {item.text || t('Edit it in the section.')}
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={() => builder.editInSection(sectionId, item.id)}
                className="bg-card flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium hover:border-[var(--builder-select)] hover:text-[var(--builder-select)]"
            >
                <PencilLine className="size-4" />
                {t('Edit in the section')}
            </button>

            <div className="bg-muted/60 flex items-center gap-1 rounded-xl border p-1">
                <ActionButton
                    label={t('Move up')}
                    disabled={item.isFirst}
                    onClick={() => handle.moveItem(item.id, -1)}
                >
                    <ArrowUp />
                </ActionButton>
                <ActionButton
                    label={t('Move down')}
                    disabled={item.isLast}
                    onClick={() => handle.moveItem(item.id, 1)}
                >
                    <ArrowDown />
                </ActionButton>
                <ActionButton
                    label={t('Duplicate')}
                    onClick={() => {
                        const copy = handle.duplicateItem(item.id);

                        if (copy) {
                            builder.selectItem(sectionId, copy);
                        }
                    }}
                >
                    <CopyPlus />
                </ActionButton>
                <span className="flex-1" />
                <ActionButton
                    label={t('Delete')}
                    destructive
                    onClick={() => {
                        handle.removeItem(item.id);
                        builder.selectSection(sectionId);
                    }}
                >
                    <Trash2 />
                </ActionButton>
            </div>

            <ItemTabs
                key={item.id}
                look={item.props.look}
                isLookLocked={isLocked(
                    builder.blocks.find((block) => block.id === sectionId),
                    'style',
                    developer,
                )}
                onLookChange={(look) => update({ look })}
            >
                <ItemSettings item={item} handle={handle} onChange={update} />
            </ItemTabs>
        </div>
    );
}
