import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    ChevronRight,
    Eye,
    EyeOff,
    GripVertical,
    Lock,
    Plus,
} from 'lucide-react';
import { useState } from 'react';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { isLocked } from '@/lib/locks';
import { cn } from '@/lib/utils';
import { MAX_SECTIONS } from '@/lib/page-value';
import type { PartKey, Section } from '@/types';
import { useBuilderContext } from './builder-context';
import { scrollFrameTo } from './frame-dom';
import { sectionIcon, sectionKind, useSectionTitle } from './section-meta';
import { ItemTree, PartLine } from './structure-tree-rows';
import {
    buildStructureTree,
    itemPath,
    type SectionNode,
} from './structure-tree';
import { TemplateMenu } from './template-menu';

/**
 * The page as a tree, in page order. The header is the top line and the
 * footer the bottom one. Drag a section by its handle to move it, tap the
 * eye to hide it from the page, tap its row to edit it, and open it with
 * its arrow to see its items; tapping an item opens that item's settings.
 */
export function LayersPanel({ onPicked }: { onPicked?: () => void }) {
    const t = useT();
    const { builder, templates } = useBuilderContext();
    const { developer, ownBlocks, parts, fieldLanguages } = useHost();
    const { blocks, selection } = builder;
    // What the user opened or closed by hand. The picked section is open
    // until then. Local to this tab, so it is gone when the tab closes.
    const [toggled, setToggled] = useState<Readonly<Record<string, boolean>>>(
        {},
    );
    const nodes = buildStructureTree(blocks, {
        keepEmpty: !!fieldLanguages,
        ownBlocks,
        canOpenItems: (section) =>
            section.type === 'rich' && !isLocked(section, 'content', developer),
    });
    const header = parts.find((part) => part.key === 'header');
    const footer = parts.find((part) => part.key === 'footer');
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    function handleDragEnd({ active, over }: DragEndEvent) {
        if (!over || active.id === over.id) {
            return;
        }

        const target = blocks.findIndex((block) => block.id === over.id);

        if (target !== -1) {
            builder.moveSectionTo(String(active.id), target);
        }
    }

    function isPartOpen(part: PartKey) {
        return builder.panel.name === 'part' && builder.panel.part === part;
    }

    function pickPart(part: PartKey) {
        builder.selectPart(part);
        onPicked?.();
    }

    /** The same as tapping the item on the canvas: its settings open. */
    function pickItem(node: SectionNode, itemId: string) {
        builder.selectItem(node.id, itemId);
        scrollFrameTo({
            sectionId: node.id,
            path:
                node.section.type === 'rich'
                    ? itemPath(node.section.data.document, itemId)
                    : null,
        });
        onPicked?.();
    }

    return (
        <div className="grid grid-cols-1 gap-3">
            <p className="text-muted-foreground text-xs">
                {t(
                    'Drag the handle to change the order. Tap a section to edit it.',
                )}
            </p>

            {header && (
                <PartLine
                    part="header"
                    title={header.title}
                    isSelected={isPartOpen('header')}
                    onPick={() => pickPart('header')}
                />
            )}

            {blocks.length === 0 ? (
                <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
                    {t('Your page has no sections yet.')}
                </p>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={blocks.map((block) => block.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <ol className="grid grid-cols-1 gap-1.5">
                            {nodes.map((node, index) => (
                                <LayerRow
                                    key={node.id}
                                    block={node.section}
                                    node={node}
                                    index={index}
                                    isOpen={
                                        node.canExpand &&
                                        (toggled[node.id] ??
                                            selection.sectionId === node.id)
                                    }
                                    onToggleOpen={() =>
                                        setToggled((current) => ({
                                            ...current,
                                            [node.id]: !(
                                                current[node.id] ??
                                                selection.sectionId === node.id
                                            ),
                                        }))
                                    }
                                    pickedItemId={
                                        selection.sectionId === node.id
                                            ? selection.itemId
                                            : null
                                    }
                                    onPickItem={(itemId) =>
                                        pickItem(node, itemId)
                                    }
                                    isSelected={selection.sectionId === node.id}
                                    onPick={() => {
                                        builder.selectSection(node.id);
                                        builder.scrollToSection(node.id);
                                        onPicked?.();
                                    }}
                                    onToggleHidden={() =>
                                        builder.toggleHidden(node.id)
                                    }
                                />
                            ))}
                        </ol>
                    </SortableContext>
                </DndContext>
            )}

            {footer && (
                <PartLine
                    part="footer"
                    title={footer.title}
                    isSelected={isPartOpen('footer')}
                    onPick={() => pickPart('footer')}
                />
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
                <TemplateMenu
                    templates={templates}
                    align="start"
                    onPick={(template) => builder.addSection(template)}
                >
                    <button
                        type="button"
                        disabled={!builder.canAddSection}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-[var(--builder-select)] hover:bg-[var(--builder-select)]/10 disabled:opacity-40"
                    >
                        <Plus className="size-4" />
                        {t('Add section')}
                    </button>
                </TemplateMenu>
                <span className="text-muted-foreground text-xs">
                    {t(':count of :max sections', {
                        count: blocks.length,
                        max: MAX_SECTIONS,
                    })}
                </span>
            </div>
        </div>
    );
}

function LayerRow({
    block,
    node,
    index,
    isSelected,
    isOpen,
    pickedItemId,
    onPick,
    onPickItem,
    onToggleOpen,
    onToggleHidden,
}: {
    block: Section;
    node: SectionNode;
    index: number;
    isSelected: boolean;
    isOpen: boolean;
    pickedItemId: string | null;
    onPick: () => void;
    onPickItem: (itemId: string) => void;
    onToggleOpen: () => void;
    onToggleHidden: () => void;
}) {
    const t = useT();
    const { developer } = useHost();
    const canMove = !isLocked(block, 'move', developer);
    const canRemove = !isLocked(block, 'remove', developer);
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id, disabled: !canMove });
    const Icon = sectionIcon(block);
    const isHidden = block.hidden === true;
    const title = useSectionTitle()(block);

    return (
        <li
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            className={cn(isDragging && 'relative z-10')}
        >
            <div
                className={cn(
                    'group/row bg-card flex items-center gap-1 rounded-xl border p-1 pr-1.5 transition-[border-color,box-shadow]',
                    isSelected
                        ? 'border-[var(--builder-select)] shadow-[0_0_0_1px_var(--builder-select)]'
                        : 'hover:border-input',
                    isDragging && 'shadow-lg',
                )}
            >
                {canMove ? (
                    <button
                        ref={setActivatorNodeRef}
                        type="button"
                        {...attributes}
                        {...listeners}
                        aria-label={t('Move section :number', {
                            number: index + 1,
                        })}
                        className="text-muted-foreground/70 hover:bg-muted hover:text-foreground grid h-9 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-md active:cursor-grabbing"
                    >
                        <GripVertical className="size-4" />
                    </button>
                ) : (
                    <span
                        title={t('Locked')}
                        className="text-muted-foreground/60 grid h-9 w-6 shrink-0 place-items-center"
                    >
                        <Lock className="size-3.5" />
                    </span>
                )}
                {node.canExpand ? (
                    <button
                        type="button"
                        onClick={onToggleOpen}
                        aria-expanded={isOpen}
                        aria-label={
                            isOpen
                                ? t('Hide items of section :number', {
                                      number: index + 1,
                                  })
                                : t('Show items of section :number', {
                                      number: index + 1,
                                  })
                        }
                        className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-6 shrink-0 place-items-center rounded-md"
                    >
                        <ChevronRight
                            className={cn(
                                'size-4 transition-transform',
                                isOpen && 'rotate-90',
                            )}
                        />
                    </button>
                ) : (
                    <span aria-hidden className="size-6 shrink-0" />
                )}
                <button
                    type="button"
                    onClick={onPick}
                    className={cn(
                        'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1 text-left',
                        isHidden && 'opacity-55',
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
                            {title}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs">
                            {index + 1}.{' '}
                            {block.type === 'ref'
                                ? `#${String(block.ref)}`
                                : sectionKind(block, t)}
                            {isHidden && ` · ${t('Hidden')}`}
                        </span>
                    </span>
                </button>
                {canRemove && (
                    <button
                        type="button"
                        onClick={onToggleHidden}
                        aria-label={
                            isHidden
                                ? t('Show section :number on the page', {
                                      number: index + 1,
                                  })
                                : t('Hide section :number from the page', {
                                      number: index + 1,
                                  })
                        }
                        title={
                            isHidden
                                ? t('Show on the page')
                                : t('Hide from the page')
                        }
                        className={cn(
                            'hover:bg-muted grid size-8 shrink-0 place-items-center rounded-md transition-colors',
                            isHidden
                                ? 'text-foreground'
                                : 'text-muted-foreground/70 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100',
                        )}
                    >
                        {isHidden ? (
                            <EyeOff className="size-4" />
                        ) : (
                            <Eye className="size-4" />
                        )}
                    </button>
                )}
            </div>
            {isOpen && (
                <ItemTree
                    items={node.items}
                    pickedItemId={pickedItemId}
                    onPick={onPickItem}
                />
            )}
        </li>
    );
}
