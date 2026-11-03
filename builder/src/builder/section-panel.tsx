import { Lock, Paintbrush, Palette, SlidersHorizontal, Type } from 'lucide-react';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { isLocked } from '@/lib/locks';
import { withDataPart } from '@/lib/page-value';
import { cn } from '@/lib/utils';
import type { RichSection, SectionData } from '@/types';
import {
    hasInvalidBackgroundColor,
    RichLookFields,
} from '../editor/rich-look-fields';
import { useBuilderContext } from './builder-context';
import { ItemGrid } from './catalog-tiles';
import { RefSectionPanel } from './ref-section-panel';
import { SectionActions } from './section-actions';
import { useSectionTitle } from './section-meta';
import { LAYOUT_ICONS, LAYOUT_LABELS } from './section-thumbs';
import { SectionWords } from './section-words';
import { AdvancedFields } from './style/advanced-fields';
import { StylePanel } from './style/style-panel';
import type { SectionTab } from './types';

const TABS: { name: SectionTab; label: string; icon: typeof Type }[] = [
    { name: 'content', label: 'Content', icon: Type },
    { name: 'look', label: 'Look', icon: Palette },
    { name: 'style', label: 'Style', icon: Paintbrush },
    { name: 'advanced', label: 'Advanced', icon: SlidersHorizontal },
];

/**
 * The picked section: type its words, add items to it, change its look (layout, background, space, presets), its
 * open style per device and its advanced settings, or hide, copy, move
 * and delete it. The words stay open on the other tabs too, out of sight,
 * so the editor keeps the cursor.
 */
export function SectionPanel() {
    const { builder } = useBuilderContext();
    const index = builder.blocks.findIndex(
        (block) => block.id === builder.selection.sectionId,
    );

    if (index === -1) {
        return null;
    }

    const block = builder.blocks[index];

    return block.type === 'ref' ? (
        <RefSectionPanel block={block} index={index} />
    ) : (
        <RichSectionPanel block={block} index={index} />
    );
}

function RichSectionPanel({ block, index }: { block: RichSection; index: number }) {
    const t = useT();
    const { builder } = useBuilderContext();
    const { accent, developer } = useHost();
    const titleOf = useSectionTitle();
    const { sectionTab, setSectionTab: setTab } = builder;
    const Icon = LAYOUT_ICONS[block.data.layout];
    const isContentLocked = isLocked(block, 'content', developer);
    // A style lock keeps the look, the style and the advanced settings.
    const tabs = isLocked(block, 'style', developer)
        ? TABS.filter((entry) => entry.name === 'content')
        : TABS;
    const tab = tabs.some((entry) => entry.name === sectionTab)
        ? sectionTab
        : 'content';

    /** Only the look changes here. The words come from the latest document. */
    function updateData(update: (data: SectionData) => SectionData) {
        builder.updateSection(block.id, (current) =>
            current.type === 'rich'
                ? {
                      ...current,
                      data: {
                          ...update(current.data),
                          document: current.data.document,
                      },
                  }
                : current,
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--builder-select)] text-white shadow-sm">
                    <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-semibold">
                        {titleOf(block)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                        {t('Section :number of :count', {
                            number: index + 1,
                            count: builder.blocks.length,
                        })}{' '}
                        · {t(LAYOUT_LABELS[block.data.layout])}
                        {block.hidden === true && ` · ${t('Hidden')}`}
                        {block.lock !== undefined && ` · ${t('Locked')}`}
                    </p>
                </div>
            </div>

            <SectionActions block={block} index={index} />

            <div
                role="tablist"
                aria-label={t('Section settings')}
                hidden={tabs.length === 1}
                className="grid grid-cols-4 border-b"
            >
                {tabs.map(({ name, label, icon: TabIcon }) => (
                    <button
                        key={name}
                        type="button"
                        role="tab"
                        aria-selected={tab === name}
                        onClick={() => setTab(name)}
                        className={cn(
                            '-mb-px flex h-11 flex-col items-center justify-center gap-0.5 border-b-2 text-[11px] font-medium transition-colors',
                            tab === name
                                ? 'text-foreground border-[var(--builder-select)]'
                                : 'text-muted-foreground hover:text-foreground border-transparent',
                        )}
                    >
                        <TabIcon className="size-4" />
                        {t(label)}
                    </button>
                ))}
            </div>

            {hasInvalidBackgroundColor(block.data) && (
                <p role="alert" className="text-destructive text-sm">
                    {t(
                        'The background colour code is not valid. Fix it on the Look tab.',
                    )}
                </p>
            )}

            {tab === 'content' && isContentLocked && <LockedNote />}
            {!isContentLocked && (
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
            )}
            {tab === 'look' && (
                <RichLookFields
                    data={block.data}
                    accent={accent}
                    onChange={(data) => updateData(() => data)}
                />
            )}
            {tab === 'style' && (
                <StylePanel
                    bag={block.data.style}
                    onChange={(style) =>
                        updateData((data) => withDataPart(data, 'style', style))
                    }
                />
            )}
            {tab === 'advanced' && (
                <AdvancedFields
                    advanced={block.data.advanced}
                    onChange={(advanced) =>
                        updateData((data) =>
                            withDataPart(data, 'advanced', advanced),
                        )
                    }
                />
            )}
        </div>
    );
}

/** Instead of the words, in a section locked for content. */
function LockedNote() {
    const t = useT();

    return (
        <div className="bg-muted/60 text-muted-foreground flex items-start gap-3 rounded-xl p-3 text-sm leading-relaxed">
            <Lock className="mt-0.5 size-4 shrink-0" />
            <div className="grid gap-0.5">
                <p className="text-foreground font-semibold">{t('Locked')}</p>
                <p>
                    {t(
                        'This section is locked, so its words and items can not be changed here.',
                    )}
                </p>
            </div>
        </div>
    );
}
