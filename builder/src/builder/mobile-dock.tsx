import {
    ChevronDown,
    Layers,
    type LucideIcon,
    PencilRuler,
    Plus,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useBuilderContext } from './builder-context';
import type { SidebarPanel } from './types';

type DockTab = {
    key: string;
    label: string;
    icon: LucideIcon;
    panel: SidebarPanel;
    isActive: (panel: SidebarPanel) => boolean;
};

/** The fourth tab, while a section or an item is picked. */
const EDIT_TABS = {
    item: { label: 'Edit item' },
    section: { label: 'Edit section' },
};

/**
 * On phones and tablets held upright there is no room for a sidebar. The
 * canvas fills the screen, and the sidebar's panels open in a sheet from
 * this bar at the bottom. The page stays visible above the sheet.
 */
export function MobileDock({
    open,
    onOpenChange,
    children,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The sidebar, shown in the sheet. */
    children: ReactNode;
}) {
    const t = useT();
    const { builder } = useBuilderContext();
    const { panel, selection } = builder;
    // An item's settings are a form, so they get more room. Elsewhere the
    // page stays in sight above the sheet.
    const isTall =
        panel.name === 'item' ||
        panel.name === 'design' ||
        panel.name === 'siteInfo' ||
        panel.name === 'part';
    const tabs: DockTab[] = [
        {
            key: 'add',
            label: 'Add',
            icon: Plus,
            panel: { name: 'add' },
            isActive: (current) => current.name === 'add',
        },
        {
            key: 'layers',
            label: 'Structure',
            icon: Layers,
            panel: { name: 'layers' },
            isActive: (current) => current.name === 'layers',
        },
    ];

    if (selection.sectionId) {
        tabs.push({
            key: 'edit',
            label: (selection.itemId ? EDIT_TABS.item : EDIT_TABS.section).label,
            icon: PencilRuler,
            panel: { name: selection.itemId ? 'item' : 'section' },
            isActive: (current) =>
                current.name === 'section' || current.name === 'item',
        });
    }

    function handleTab(tab: DockTab) {
        if (open && tab.isActive(panel)) {
            onOpenChange(false);

            return;
        }

        builder.openPanel(tab.panel);
        onOpenChange(true);
    }

    return (
        <>
            {open && (
                <div
                    role="dialog"
                    data-builder-sheet=""
                    aria-label={t('Editor panel')}
                    className={cn(
                        'animate-in slide-in-from-bottom-6 fade-in-0 bg-card fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 flex flex-col overflow-hidden rounded-t-2xl border-t shadow-[0_-12px_40px_-12px_rgb(15_23_42/0.35)] transition-[height] duration-200',
                        isTall
                            ? 'h-[calc(100dvh-8.25rem-env(safe-area-inset-bottom))]'
                            : 'h-[min(62dvh,36rem)]',
                    )}
                >
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        aria-label={t('Close the panel')}
                        className="text-muted-foreground/70 hover:text-foreground flex h-6 shrink-0 items-center justify-center"
                    >
                        <ChevronDown className="size-5" />
                    </button>
                    <div className="min-h-0 flex-1">{children}</div>
                </div>
            )}

            <nav
                aria-label={t('Editor panels')}
                className="bg-card fixed inset-x-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom)]"
            >
                <div
                    className={cn(
                        'mx-auto grid h-16 max-w-xl gap-1 px-2',
                        tabs.length === 3 ? 'grid-cols-3' : 'grid-cols-2',
                    )}
                >
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = open && tab.isActive(panel);

                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => handleTab(tab)}
                                aria-pressed={isActive}
                                className={cn(
                                    'my-2 flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition-colors',
                                    isActive
                                        ? 'bg-[var(--builder-select)]/10 text-[var(--builder-select)]'
                                        : tab.key === 'edit'
                                          ? 'text-[var(--builder-select)]'
                                          : 'text-muted-foreground',
                                )}
                            >
                                <Icon className="size-5" />
                                {t(tab.label)}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
