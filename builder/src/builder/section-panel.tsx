import {
    ArrowDown,
    ArrowUp,
    CopyPlus,
    Eye,
    EyeOff,
    Paintbrush,
    Trash2,
    Type,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/ui/tooltip';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { blockTitle } from '../editor/block-meta';
import {
    hasInvalidBackgroundColor,
    RichLookFields,
} from '../editor/rich-look-fields';
import { useBuilderContext } from './builder-context';
import { ItemGrid } from './catalog-tiles';
import { LAYOUT_ICONS, LAYOUT_LABELS } from './section-thumbs';
import { SectionWords } from './section-words';

/**
 * The picked section: type its words, add items to it, change its look
 * (layout, background, space, style, link name), or hide, copy, move and
 * delete it. The words stay open on the Style tab too, out of sight, so
 * the editor keeps the cursor.
 */
export function SectionPanel() {
    const t = useT();
    const { builder, onDeleteSection } = useBuilderContext();
    const { accent } = useHost();
    const { sectionTab: tab, setSectionTab: setTab } = builder;
    const index = builder.blocks.findIndex(
        (block) => block.id === builder.selection.sectionId,
    );

    if (index === -1) {
        return null;
    }

    const block = builder.blocks[index];
    const Icon = LAYOUT_ICONS[block.data.layout];
    const isHidden = block.hidden === true;
    const count = builder.blocks.length;

    return (
        <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--builder-select)] text-white shadow-sm">
                    <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-semibold">
                        {blockTitle(block) || t('Empty section')}
                    </p>
                    <p className="text-muted-foreground text-xs">
                        {t('Section :number of :count', {
                            number: index + 1,
                            count,
                        })}{' '}
                        · {t(LAYOUT_LABELS[block.data.layout])}
                        {isHidden && ` · ${t('Hidden')}`}
                    </p>
                </div>
            </div>

            <div className="bg-muted/60 flex items-center gap-1 rounded-xl border p-1">
                <ActionButton
                    label={
                        isHidden ? t('Show on the page') : t('Hide from the page')
                    }
                    onClick={() => builder.toggleHidden(block.id)}
                    isActive={isHidden}
                >
                    {isHidden ? <EyeOff /> : <Eye />}
                </ActionButton>
                <ActionButton
                    label={t('Move up')}
                    disabled={index === 0}
                    onClick={() => builder.moveSection(block.id, -1)}
                >
                    <ArrowUp />
                </ActionButton>
                <ActionButton
                    label={t('Move down')}
                    disabled={index === count - 1}
                    onClick={() => builder.moveSection(block.id, 1)}
                >
                    <ArrowDown />
                </ActionButton>
                <ActionButton
                    label={t('Duplicate')}
                    disabled={!builder.canAddSection}
                    onClick={() => builder.duplicateSection(block.id)}
                >
                    <CopyPlus />
                </ActionButton>
                <span className="flex-1" />
                <ActionButton
                    label={t('Delete section')}
                    destructive
                    onClick={() => onDeleteSection(block.id)}
                >
                    <Trash2 />
                </ActionButton>
            </div>

            <div
                role="tablist"
                aria-label={t('Section settings')}
                className="grid grid-cols-2 border-b"
            >
                {(
                    [
                        ['content', t('Content'), Type],
                        ['style', t('Style'), Paintbrush],
                    ] as const
                ).map(([name, label, TabIcon]) => (
                    <button
                        key={name}
                        type="button"
                        role="tab"
                        aria-selected={tab === name}
                        onClick={() => setTab(name)}
                        className={cn(
                            '-mb-px flex h-10 items-center justify-center gap-2 border-b-2 text-sm font-medium transition-colors',
                            tab === name
                                ? 'text-foreground border-[var(--builder-select)]'
                                : 'text-muted-foreground hover:text-foreground border-transparent',
                        )}
                    >
                        <TabIcon className="size-4" />
                        {label}
                    </button>
                ))}
            </div>

            {hasInvalidBackgroundColor(block.data) && (
                <p role="alert" className="text-destructive text-sm">
                    {t(
                        'The background colour code is not valid. Fix it on the Style tab.',
                    )}
                </p>
            )}

            <div hidden={tab !== 'content'} className="grid grid-cols-1 gap-4">
                <SectionWords block={block} />
                <div className="grid gap-1">
                    <p className="text-foreground text-sm font-medium">
                        {t('Add to this section')}
                    </p>
                    <p className="text-muted-foreground text-xs">
                        {builder.selection.itemId
                            ? t(
                                  'Tap to add under the picked item, or drag to any place.',
                              )
                            : t('Tap to add at the end, or drag to any place.')}
                    </p>
                </div>
                <ItemGrid
                    layout={block.data.layout}
                    onPick={(key) => builder.addItem(key)}
                />
            </div>
            {tab === 'style' && (
                <RichLookFields
                    data={block.data}
                    accent={accent}
                    onChange={(data) =>
                        // Only the look changes here. The words come from
                        // the latest document, which may be newer.
                        builder.updateSection(block.id, (current) => ({
                            ...current,
                            data: { ...data, document: current.data.document },
                        }))
                    }
                />
            )}
        </div>
    );
}

export function ActionButton({
    label,
    onClick,
    disabled,
    destructive,
    isActive,
    children,
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    destructive?: boolean;
    isActive?: boolean;
    children: ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    disabled={disabled}
                    onClick={onClick}
                    className={cn(
                        'grid size-8 place-items-center rounded-lg transition-colors disabled:opacity-35 [&_svg]:size-4',
                        destructive
                            ? 'text-destructive hover:bg-destructive/10'
                            : 'text-muted-foreground hover:bg-card hover:text-foreground dark:hover:bg-input/50 hover:shadow-sm',
                        isActive &&
                            'bg-card text-foreground dark:bg-input/70 shadow-sm',
                    )}
                >
                    {children}
                </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}
