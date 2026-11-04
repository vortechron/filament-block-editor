import { ArrowDown, ArrowUp, CopyPlus, PencilLine, Replace, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { isLocked } from '@/lib/locks';
import { changeGroup } from '@/lib/page-history';
import { parseLook } from '../editor/look-prop';
import { ActionButton } from './action-button';
import { useBuilderContext } from './builder-context';
import { ItemGrid } from './catalog-tiles';
import { describeBlock } from './item-catalog';
import { ItemSettings } from './item-settings';
import { ItemTabs } from './item-tabs';
import { Skeleton } from '@/ui/skeleton';
import type { Section, SectionLayout } from '@/types';
import type { ItemKey, ItemSnapshot, SectionEditorHandle } from './types';

/** The item's props again after every change, for the fields below. */
function readItem(
    handle: SectionEditorHandle | null,
    itemId: string,
    _version: number,
): ItemSnapshot | null {
    return handle?.getItem(itemId) ?? null;
}

/**
 * The undo group of a change to an item: typing in one setting is one
 * step, another setting is another. Its look is one JSON string, so a
 * look change is grouped by the style or advanced value it changes.
 */
function itemChangeGroup(
    scope: string,
    current: Record<string, unknown>,
    props: Record<string, unknown>,
): string {
    const keys = Object.keys(props);

    return keys.length === 1 && keys[0] === 'look'
        ? changeGroup(`${scope}:look`, parseLook(current.look), parseLook(props.look))
        : changeGroup(scope, current, { ...current, ...props });
}

/**
 * The picked item: its own settings (item-settings.tsx), its style and
 * advanced tabs, and buttons to move, copy or delete it. Every change goes
 * into the section's editor, and the page shows it a moment later.
 */
export function ItemPanel() {
    const t = useT();
    const { builder, form, noteDeleted } = useBuilderContext();
    const { ownBlocks, developer } = useHost();
    const { sectionId, itemId } = builder.selection;
    const handle = builder.handleFor(sectionId);
    const [version, setVersion] = useState(0);
    const [replacing, setReplacing] = useState<string | null>(null);

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
        form.inGroup(
            itemChangeGroup(`item:${sectionId}:${item.id}`, item.props, props),
            () => handle.updateItem(item.id, props),
        );

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
                <ActionButton
                    label={t('Replace with another item')}
                    onClick={() =>
                        setReplacing(replacing === item.id ? null : item.id)
                    }
                >
                    <Replace />
                </ActionButton>
                <span className="flex-1" />
                <ActionButton
                    label={t('Delete')}
                    destructive
                    onClick={() => {
                        const stepsBefore = form.stepCount();

                        handle.removeItem(item.id);
                        builder.selectSection(sectionId);
                        noteDeleted('item', stepsBefore);
                    }}
                >
                    <Trash2 />
                </ActionButton>
            </div>

            {replacing === item.id && (
                <ReplacePicker
                    layout={sectionLayout(builder.blocks, sectionId)}
                    onCancel={() => setReplacing(null)}
                    onPick={(key) => {
                        setReplacing(null);
                        builder.swapItem(sectionId, item.id, key);
                    }}
                />
            )}

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
                <ItemSettings
                    item={item}
                    handle={handle}
                    onChange={update}
                    onWords={(text) =>
                        form.inGroup(`words:${sectionId}:${item.id}`, () =>
                            handle.setItemText(item.id, text),
                        )
                    }
                />
            </ItemTabs>
        </div>
    );
}

/**
 * The items one can put in the picked item's place, like Image where a
 * drawn picture is. The picked item goes; the new one opens.
 */
function ReplacePicker({
    layout,
    onPick,
    onCancel,
}: {
    layout: SectionLayout | null;
    onPick: (key: ItemKey) => void;
    onCancel: () => void;
}) {
    const t = useT();

    return (
        <section className="grid gap-3 rounded-xl border border-[var(--builder-select)]/30 p-3">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-foreground text-sm font-semibold">
                    {t('Replace with')}
                </h3>
                <button
                    type="button"
                    onClick={onCancel}
                    aria-label={t('Cancel')}
                    title={t('Cancel')}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-7 place-items-center rounded-md"
                >
                    <X className="size-4" />
                </button>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
                {t('The new item goes in the same place. Undo brings the old one back.')}
            </p>
            <ItemGrid layout={layout} onPick={onPick} />
        </section>
    );
}

/** The layout of the section an item is in, for its own "New card" tile. */
function sectionLayout(blocks: Section[], sectionId: string): SectionLayout | null {
    const section = blocks.find((block) => block.id === sectionId);

    return section?.type === 'rich' ? section.data.layout : null;
}
