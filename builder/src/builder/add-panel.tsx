import { MousePointerClick, Search, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { lastRich } from '@/lib/page-value';
import type { SectionTemplate } from '@/types';
import { useBuilderContext } from './builder-context';
import {
    ItemGrid,
    matchesSearch,
    SyncedTile,
    TemplateTile,
} from './catalog-tiles';
import { useSectionTitle } from './section-meta';

type AddTab = 'sections' | 'items';

/**
 * Names for the template categories the PHP side uses
 * (Templates\SectionTemplates). A template may bring its own name for
 * any other category in `categoryLabel`.
 */
export const CATEGORY_LABELS: Record<string, string> = {
    opening: 'First screen',
    proof: 'Trust',
    selling: 'Highlights',
    features: 'Highlights',
    offer: 'Call to action',
    action: 'Call to action',
    help: 'Questions and contact',
    contact: 'Questions and contact',
    content: 'Content',
    media: 'Photos and videos',
    basic: 'Basic',
    saved: 'Saved sections',
};

/** The categories in the order their first template comes, basic last. */
export function templateCategories(
    templates: readonly SectionTemplate[],
): { key: string; label: string | null }[] {
    const seen = new Map<string, string | null>();

    for (const template of templates) {
        if (!seen.has(template.category)) {
            seen.set(template.category, template.categoryLabel);
        }
    }

    return [...seen]
        .map(([key, label]) => ({ key, label }))
        .sort(
            (a, b) =>
                Number(a.key === 'basic') - Number(b.key === 'basic'),
        );
}

function categoryName(
    category: { key: string; label: string | null },
    t: (text: string) => string,
): string {
    if (category.label) {
        return category.label;
    }

    const known = CATEGORY_LABELS[category.key];

    if (known) {
        return t(known);
    }

    const words = category.key.replace(/[_-]+/g, ' ');

    return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Everything that can be added: ready-made sections, and items (a
 * heading, a photo, a button…) for inside a section. Tap to add after
 * what is picked on the canvas, or drag to the exact place.
 */
export function AddPanel({ onAdded }: { onAdded?: () => void }) {
    const t = useT();
    const { builder, templates, library, isDesktop } = useBuilderContext();
    const { kind } = useHost();
    const titleOf = useSectionTitle();
    const { selection, blocks } = builder;
    const [tab, setTab] = useState<AddTab>(
        selection.sectionId ? 'items' : 'sections',
    );
    const [query, setQuery] = useState('');
    const sectionIndex = blocks.findIndex(
        (block) => block.id === selection.sectionId,
    );
    const section = sectionIndex === -1 ? null : blocks[sectionIndex];
    const shownTemplates = templates.filter((template) =>
        matchesSearch(query, template.label, template.description),
    );
    // A synced section's own builder can not hold a ref: only one level
    // is followed (docs/v2-plan.md, section 5).
    const shownSynced =
        kind === 'section'
            ? []
            : library.synced.filter((entry) =>
                  matchesSearch(query, entry.title),
              );

    return (
        <div className="grid grid-cols-1 gap-4">
            <div
                role="tablist"
                aria-label={t('What to add')}
                className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1"
            >
                {(['sections', 'items'] as const).map((name) => (
                    <button
                        key={name}
                        type="button"
                        role="tab"
                        aria-selected={tab === name}
                        onClick={() => setTab(name)}
                        className={cn(
                            'h-8 rounded-md text-sm font-medium transition-colors',
                            tab === name
                                ? 'bg-card text-foreground dark:bg-input/70 shadow-sm'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {name === 'sections' ? t('Sections') : t('Items')}
                    </button>
                ))}
            </div>

            <label className="relative block">
                <span className="sr-only">{t('Search')}</span>
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={
                        tab === 'sections'
                            ? t('Search sections')
                            : t('Search items')
                    }
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 bg-card h-9 w-full rounded-lg border pr-3 pl-9 text-sm outline-none focus-visible:ring-[3px]"
                />
            </label>

            <PlacementNote
                tab={tab}
                sectionLabel={
                    section
                        ? `${sectionIndex + 1}. ${titleOf(section)}`
                        : null
                }
                hasItem={selection.itemId !== null}
                onClear={builder.clearSelection}
            />

            {tab === 'sections' ? (
                shownTemplates.length === 0 && shownSynced.length === 0 ? (
                    <p className="text-muted-foreground py-6 text-center text-sm">
                        {t('Nothing matches your search.')}
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-5">
                        {templateCategories(shownTemplates).map((category) => {
                            const inGroup = shownTemplates.filter(
                                (template) =>
                                    template.category === category.key,
                            );

                            return (
                                <TileGroup
                                    key={category.key}
                                    label={categoryName(category, t)}
                                >
                                    {inGroup.map((template) => (
                                        <TemplateTile
                                            key={template.key}
                                            template={template}
                                            onPick={() => {
                                                builder.addSection(
                                                    template,
                                                    builder.sectionInsertIndex(),
                                                );
                                                onAdded?.();
                                            }}
                                        />
                                    ))}
                                </TileGroup>
                            );
                        })}
                        {shownSynced.length > 0 && (
                            <TileGroup label={t('Synced sections')}>
                                {shownSynced.map((entry) => (
                                    <SyncedTile
                                        key={String(entry.id)}
                                        synced={entry}
                                        onPick={() => {
                                            builder.addSyncedSection(
                                                entry.id,
                                                builder.sectionInsertIndex(),
                                            );
                                            onAdded?.();
                                        }}
                                    />
                                ))}
                            </TileGroup>
                        )}
                    </div>
                )
            ) : (
                <ItemGrid
                    layout={
                        (section?.type === 'rich' ? section : lastRich(blocks))
                            ?.data.layout ?? null
                    }
                    query={query}
                    onPick={(key) => {
                        builder.addItem(key);
                        onAdded?.();
                    }}
                />
            )}

            {isDesktop && (
                <p className="text-muted-foreground bg-muted/60 flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs">
                    <MousePointerClick className="size-4 shrink-0" />
                    {t(
                        'Tip: drag a tile onto the page to drop it exactly where you want.',
                    )}
                </p>
            )}
        </div>
    );
}

/** One category of section tiles under its name. */
function TileGroup({ label, children }: { label: string; children: ReactNode }) {
    return (
        <section className="grid gap-2">
            <h3 className="text-muted-foreground px-0.5 text-[11px] font-semibold tracking-wider uppercase">
                {label}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">{children}</div>
        </section>
    );
}

/** Says where a tapped tile goes, so nothing lands in a surprising place. */
function PlacementNote({
    tab,
    sectionLabel,
    hasItem,
    onClear,
}: {
    tab: AddTab;
    sectionLabel: string | null;
    hasItem: boolean;
    onClear: () => void;
}) {
    const t = useT();

    const text =
        sectionLabel === null
            ? tab === 'sections'
                ? t('New sections go at the end of the page.')
                : t('New items go at the end of the last section.')
            : tab === 'sections'
              ? t('Adds after :section', { section: sectionLabel })
              : hasItem
                ? t('Adds under the picked item in :section', {
                      section: sectionLabel,
                  })
                : t('Adds to the end of :section', { section: sectionLabel });

    return (
        <div className="text-foreground flex items-start gap-2 rounded-lg border border-[var(--builder-select)]/25 bg-[var(--builder-select)]/[0.06] px-3 py-2 text-xs">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--builder-select)]" />
            <span className="min-w-0 flex-1 leading-relaxed">{text}</span>
            {sectionLabel !== null && (
                <button
                    type="button"
                    onClick={onClear}
                    aria-label={t('Pick nothing')}
                    title={t('Pick nothing')}
                    className="text-muted-foreground hover:bg-card hover:text-foreground -m-1 grid size-6 shrink-0 place-items-center rounded-md"
                >
                    <X className="size-3.5" />
                </button>
            )}
        </div>
    );
}
