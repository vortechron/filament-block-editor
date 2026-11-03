import { GripVertical } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type {
    SectionData,
    SectionLayout,
    SectionTemplate,
    SyncedSectionOption,
} from '@/types';
import { useBuilderContext } from './builder-context';
import { type DragData, useCatalogDrag, wasJustDragged } from './drag-and-drop';
import {
    type CatalogGroup,
    type CatalogItem,
    catalogFor,
    GROUP_LABELS,
} from './item-catalog';
import { LAYOUT_ICONS, SectionThumb } from './section-thumbs';
import type { ItemKey } from './types';

const GROUP_ORDER: CatalogGroup[] = [
    'section',
    'text',
    'media',
    'layout',
    'own',
];

/** Does a text match the search box? Every word must appear somewhere. */
export function matchesSearch(query: string, ...texts: string[]): boolean {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const haystack = texts.join(' ').toLowerCase();

    return words.every((word) => haystack.includes(word));
}

/**
 * Every item, grouped (Text, Photos and videos, …). Tap one to add it, or
 * drag it to the exact place on the canvas.
 */
export function ItemGrid({
    layout,
    query = '',
    onPick,
}: {
    /** The section the item goes into, for its own "New card" entry. */
    layout: SectionLayout | null;
    query?: string;
    onPick: (key: ItemKey) => void;
}) {
    const t = useT();
    const { ownBlocks } = useHost();
    const items = catalogFor(layout, ownBlocks).filter((item) =>
        matchesSearch(
            query,
            item.isOwn ? item.label : t(item.label),
            item.label,
            item.keywords,
        ),
    );

    if (items.length === 0) {
        return (
            <p className="text-muted-foreground px-1 py-6 text-center text-sm">
                {t('Nothing matches your search.')}
            </p>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-5">
            {GROUP_ORDER.map((group) => {
                const inGroup = items.filter((item) => item.group === group);

                if (inGroup.length === 0) {
                    return null;
                }

                return (
                    <section key={group} className="grid gap-2">
                        <h3 className="text-muted-foreground px-0.5 text-[11px] font-semibold tracking-wider uppercase">
                            {t(GROUP_LABELS[group])}
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                            {inGroup.map((item) => (
                                <ItemTile
                                    key={item.key}
                                    item={item}
                                    isOwn={group === 'section'}
                                    onPick={() => onPick(item.key)}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

function ItemTile({
    item,
    isOwn,
    onPick,
}: {
    item: CatalogItem;
    isOwn: boolean;
    onPick: () => void;
}) {
    const t = useT();
    const { isDesktop } = useBuilderContext();
    const Icon = item.icon;
    const label = item.isOwn ? item.label : t(item.label);
    const { ref, isDragging, dragProps } = useCatalogDrag(`item:${item.key}`, {
        kind: 'item',
        key: item.key,
        label,
        icon: item.icon,
    });

    return (
        <button
            ref={ref}
            type="button"
            {...(isDesktop ? dragProps : {})}
            onClick={() => {
                if (!wasJustDragged()) {
                    onPick();
                }
            }}
            title={
                isDesktop ? t('Tap to add, or drag onto the page') : undefined
            }
            className={cn(
                'group/tile focus-visible:ring-ring/50 bg-card relative flex h-[5.25rem] touch-manipulation flex-col items-center justify-center gap-1.5 rounded-xl border px-1 text-center transition-[border-color,box-shadow,transform] outline-none hover:-translate-y-px hover:border-[var(--builder-select)] hover:shadow-[0_6px_16px_-10px_var(--builder-select)] focus-visible:ring-[3px] active:translate-y-0',
                isDesktop && 'cursor-grab active:cursor-grabbing',
                isOwn &&
                    'border-[var(--builder-select)]/40 bg-[var(--builder-select)]/[0.04]',
                isDragging && 'opacity-40',
            )}
        >
            <Icon
                className="text-muted-foreground size-5 transition-colors group-hover/tile:text-[var(--builder-select)]"
                strokeWidth={1.75}
            />
            <span className="text-foreground line-clamp-2 text-[11.5px] leading-tight font-medium">
                {label}
            </span>
        </button>
    );
}

/** The section's own background and words, for its drawing. */
function thumbColors(data: SectionData): CSSProperties | undefined {
    const background =
        data.background === 'color' ? data.background_color : null;

    if (background === null) {
        return undefined;
    }

    const [red, green, blue] = [1, 3, 5].map((start) =>
        parseInt(background.slice(start, start + 2), 16),
    );
    const isDark = (red * 299 + green * 587 + blue * 114) / 1000 < 128;

    return {
        '--thumb-bg': background,
        '--thumb-ink': data.text_color ?? (isDark ? '#ffffff' : '#0f172a'),
    } as CSSProperties;
}

/** A ready-made section: a small drawing of it, its name and what it is for. */
export function TemplateTile({
    template,
    onPick,
}: {
    template: SectionTemplate;
    onPick: () => void;
}) {
    return (
        <SectionTile
            dragId={`template:${template.key}`}
            drag={{
                kind: 'template',
                templateKey: template.key,
                label: template.label,
                icon: LAYOUT_ICONS[template.data.layout],
            }}
            data={template.data}
            description={template.description}
            onPick={onPick}
        />
    );
}

/**
 * A synced section the page can use: tapped or dropped, the page gets a
 * ref to it, not a copy.
 */
export function SyncedTile({
    synced,
    onPick,
}: {
    synced: SyncedSectionOption;
    onPick: () => void;
}) {
    const t = useT();
    const label = synced.title || `#${String(synced.id)}`;

    return (
        <SectionTile
            dragId={`synced:${String(synced.id)}`}
            drag={{
                kind: 'synced',
                ref: synced.id,
                label,
                icon: LAYOUT_ICONS[synced.section.data.layout],
            }}
            data={synced.section.data}
            description={t('The same on every page that uses it.')}
            onPick={onPick}
        />
    );
}

function SectionTile({
    dragId,
    drag,
    data,
    description,
    onPick,
}: {
    dragId: string;
    drag: DragData;
    data: SectionData;
    description: string;
    onPick: () => void;
}) {
    const t = useT();
    const { isDesktop } = useBuilderContext();
    const { ref, isDragging, dragProps } = useCatalogDrag(dragId, drag);

    return (
        <button
            ref={ref}
            type="button"
            {...(isDesktop ? dragProps : {})}
            onClick={() => {
                if (!wasJustDragged()) {
                    onPick();
                }
            }}
            title={
                isDesktop ? t('Tap to add, or drag onto the page') : undefined
            }
            className={cn(
                'group/tile focus-visible:ring-ring/50 bg-card grid touch-manipulation content-start gap-2 rounded-xl border p-2 text-left transition-[border-color,box-shadow] outline-none hover:border-[var(--builder-select)] hover:shadow-[0_6px_16px_-10px_var(--builder-select)] focus-visible:ring-[3px]',
                isDesktop && 'cursor-grab active:cursor-grabbing',
                isDragging && 'opacity-40',
            )}
        >
            <span className="bg-muted relative block overflow-hidden rounded-lg p-1.5">
                <span
                    className="ring-foreground/5 block overflow-hidden rounded-md shadow-sm ring-1"
                    style={thumbColors(data)}
                >
                    <SectionThumb layout={data.layout} />
                </span>
                {isDesktop && (
                    <GripVertical className="text-muted-foreground/70 absolute top-1.5 right-1 size-3.5 opacity-0 transition-opacity group-hover/tile:opacity-100" />
                )}
            </span>
            <span className="grid gap-0.5 px-0.5">
                <span className="text-foreground text-[13px] leading-tight font-semibold">
                    {drag.label}
                </span>
                <span className="text-muted-foreground line-clamp-2 text-[11.5px] leading-snug">
                    {description}
                </span>
            </span>
        </button>
    );
}
