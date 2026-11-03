import { useLayoutEffect, useRef } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Layers,
    type LucideIcon,
    Plus,
} from 'lucide-react';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { partLabel } from '@/lib/site-parts';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { AddPanel } from './add-panel';
import { DesignPanel } from './kit/design-panel';
import { useBuilderContext } from './builder-context';
import { describeBlock } from './item-catalog';
import { ItemPanel } from './item-panel';
import { LayersPanel } from './layers-panel';
import { PartPanel } from './part/part-panel';
import { SiteInfoForm } from './part/site-info-form';
import { useSectionTitle } from './section-meta';
import { SectionPanel } from './section-panel';
import { type HomePanelName, panelUnder } from './types';

type Crumb = { label: string; onClick?: () => void };

const HOME_TABS: { name: HomePanelName; label: string; icon: LucideIcon }[] = [
    { name: 'add', label: 'Add', icon: Plus },
    { name: 'layers', label: 'Structure', icon: Layers },
];

/**
 * Everything around the canvas: what to add, the list of sections, and
 * the settings of whatever is picked on the canvas. On a phone the same
 * panels sit in a sheet at the bottom of the screen.
 */
export function Sidebar({
    onDone,
}: {
    /**
     * On a phone: close the sheet after adding something. The bar at the
     * bottom of the screen has the Add and Structure tabs there.
     */
    onDone?: () => void;
}) {
    const { builder } = useBuilderContext();
    const { panel, selection } = builder;
    // A shop info row opens its group over the item or part it is in.
    const under = panelUnder(panel);
    const isHome = panel.name === 'add' || panel.name === 'layers';
    const isSection = under.name === 'section' || under.name === 'item';
    const scroll = useScrollUnder(panel.name === 'siteInfo' && under !== panel);

    return (
        <div className="flex h-full min-h-0 flex-col">
            {!(isHome && onDone) && <SidebarHeader />}
            <div
                key={
                    isSection
                        ? `section:${selection.sectionId}`
                        : under.name === 'part'
                          ? `part:${under.part}`
                          : under.name
                }
                ref={scroll.ref}
                onScroll={scroll.onScroll}
                className="animate-in fade-in-0 slide-in-from-left-1 min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 duration-200"
            >
                {panel.name === 'add' && <AddPanel onAdded={onDone} />}
                {panel.name === 'layers' && <LayersPanel onPicked={onDone} />}
                {panel.name === 'design' && <DesignPanel />}
                {panel.name === 'siteInfo' && <SiteInfoForm groups={panel.groups} />}
                {panel.name === 'part' && <PartPanel part={panel.part} />}
                {isSection && (
                    // The section's words stay open under an item's
                    // settings, which change the item through them. The
                    // item stays open under its shop info, so Back finds
                    // it as it was.
                    <>
                        {under.name === 'item' && (
                            <div hidden={panel.name !== 'item'}>
                                <ItemPanel />
                            </div>
                        )}
                        <div hidden={panel.name !== 'section'}>
                            <SectionPanel />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/**
 * The panel's scroll place: the shop info opened from a row starts at the
 * top, and Back puts the item where it was.
 */
function useScrollUnder(isOver: boolean) {
    const ref = useRef<HTMLDivElement>(null);
    const lastTop = useRef(0);
    const underTop = useRef(0);
    const wasOver = useRef(isOver);

    useLayoutEffect(() => {
        const element = ref.current;

        if (element === null || wasOver.current === isOver) {
            return;
        }

        wasOver.current = isOver;

        if (isOver) {
            underTop.current = lastTop.current;
            element.scrollTop = 0;
        } else {
            element.scrollTop = underTop.current;
        }
    }, [isOver]);

    return {
        ref,
        onScroll: () => {
            lastTop.current = ref.current?.scrollTop ?? 0;
        },
    };
}

function SidebarHeader() {
    const t = useT();
    const { ownBlocks } = useHost();
    const { builder } = useBuilderContext();
    const titleOf = useSectionTitle();
    const { panel, selection, blocks } = builder;

    if (panel.name === 'add' || panel.name === 'layers') {
        return (
            <div className="border-b p-2">
                <div
                    role="tablist"
                    aria-label={t('Editor panels')}
                    className="grid grid-cols-2 gap-1"
                >
                    {HOME_TABS.map(({ name, label, icon: Icon }) => {
                        const isActive = panel.name === name;

                        return (
                            <button
                                key={name}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => builder.openPanel({ name })}
                                className={cn(
                                    'relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-semibold transition-colors',
                                    isActive
                                        ? 'bg-[var(--builder-select)]/10 text-[var(--builder-select)]'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                <Icon className="size-[18px]" strokeWidth={2} />
                                {t(label)}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    const sectionIndex = blocks.findIndex(
        (block) => block.id === selection.sectionId,
    );
    const under = panelUnder(panel);
    const isTopBarPanel = under.name === 'design' || under.name === 'siteInfo';
    const section =
        sectionIndex === -1 || isTopBarPanel || under.name === 'part'
            ? null
            : blocks[sectionIndex];
    const goHome = () =>
        isTopBarPanel
            ? builder.openPanel({ name: builder.homePanel })
            : builder.clearSelection();
    const itemLabel = (sectionId: string, itemId: string): string => {
        const item = builder.handleFor(sectionId)?.getItem(itemId);
        const described = item ? describeBlock(item.type, item.props, ownBlocks) : null;

        if (described === null) {
            return t('Item');
        }

        return described.isOwn ? described.label : t(described.label);
    };
    const panelCrumbs: Crumb[] =
        under.name === 'design'
            ? [{ label: t('Design') }]
            : under.name === 'siteInfo'
              ? [{ label: t('Shop info') }]
              : under.name === 'part'
                ? [{ label: partLabel(under.part, t) }]
                : [];
    const isItem = under.name === 'item';
    const sectionCrumbs: Crumb[] = section
        ? [
              {
                  label: `${sectionIndex + 1}. ${titleOf(section)}`,
                  ...(isItem ? { onClick: () => builder.selectSection(section.id) } : {}),
              },
              ...(isItem && selection.itemId
                  ? [{ label: itemLabel(section.id, selection.itemId) }]
                  : []),
          ]
        : [];
    const underCrumbs: Crumb[] = [
        { label: t('Page'), onClick: goHome },
        ...panelCrumbs,
        ...sectionCrumbs,
    ];
    // Shop info opened from a row: one more step, back to the row's panel.
    const crumbs: Crumb[] =
        under === panel
            ? underCrumbs
            : [
                  ...underCrumbs.slice(0, -1),
                  { ...underCrumbs[underCrumbs.length - 1], onClick: () => builder.openPanel(under) },
                  { label: t('Shop info') },
              ];

    const back = crumbs.at(-2)?.onClick ?? goHome;
    const current = crumbs[crumbs.length - 1];
    const trail = crumbs.slice(0, -1);

    return (
        <div className="flex h-[65px] items-center gap-1.5 border-b px-2">
            <button
                type="button"
                onClick={back}
                aria-label={t('Back')}
                className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-9 shrink-0 place-items-center rounded-lg"
            >
                <ChevronLeft className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
                <nav aria-label={t('Where you are')}>
                    <ol className="flex min-w-0 items-center gap-0.5 text-xs">
                        {trail.map((crumb, index) => (
                            <li
                                key={index}
                                className={cn(
                                    'flex min-w-0 items-center gap-0.5',
                                    index === 0 ? 'shrink-0' : 'shrink',
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={crumb.onClick}
                                    className="text-muted-foreground hover:text-foreground truncate rounded hover:underline"
                                >
                                    {crumb.label}
                                </button>
                                <ChevronRight className="text-muted-foreground/50 size-3 shrink-0" />
                            </li>
                        ))}
                    </ol>
                </nav>
                <p className="text-foreground truncate text-[15px] leading-tight font-semibold">
                    {current.label}
                </p>
            </div>
            <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={() => builder.openPanel({ name: 'add' })}
                            aria-label={t('Add')}
                            className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--builder-select)] text-white shadow-sm hover:bg-[var(--builder-select)]/90"
                        >
                            <Plus className="size-[18px]" strokeWidth={2.5} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        {t('Add a section or an item')}
                    </TooltipContent>
            </Tooltip>
        </div>
    );
}
