import { Paintbrush, Settings2, SlidersHorizontal } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { parseLook, serializeLook } from '../editor/look-prop';
import { AdvancedFields } from './style/advanced-fields';
import { StylePanel } from './style/style-panel';

type ItemTab = 'settings' | 'style' | 'advanced';

const TABS: { name: ItemTab; label: string; icon: typeof Settings2 }[] = [
    { name: 'settings', label: 'Settings', icon: Settings2 },
    { name: 'style', label: 'Style', icon: Paintbrush },
    { name: 'advanced', label: 'Advanced', icon: SlidersHorizontal },
];

/**
 * The picked item's tabs: its own settings, then its style per device and
 * its advanced settings, both kept in the block's `look` prop. In a
 * section with a `style` lock, only developers get Style and Advanced
 * (the server keeps the stored look of every block in it).
 */
export function ItemTabs({
    look,
    onLookChange,
    isLookLocked = false,
    children,
}: {
    /** The block's `look` prop. */
    look: unknown;
    onLookChange: (look: string) => void;
    /** The section's style lock stops this user. */
    isLookLocked?: boolean;
    /** The item's own settings. */
    children: ReactNode;
}) {
    const t = useT();
    const [picked, setTab] = useState<ItemTab>('settings');
    const tabs = isLookLocked ? TABS.filter(({ name }) => name === 'settings') : TABS;
    const tab = isLookLocked ? 'settings' : picked;
    const current = parseLook(look);

    return (
        <div className="grid grid-cols-1 gap-5">
            <div
                role="tablist"
                aria-label={t('Item settings')}
                className={cn('grid border-b', isLookLocked ? 'grid-cols-1' : 'grid-cols-3')}
            >
                {tabs.map(({ name, label, icon: Icon }) => (
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
                        <Icon className="size-4" />
                        {t(label)}
                    </button>
                ))}
            </div>

            {tab === 'settings' && children}
            {tab === 'style' && (
                <StylePanel
                    bag={current.style}
                    onChange={(style) =>
                        onLookChange(
                            serializeLook({ ...current, style: style ?? undefined }),
                        )
                    }
                />
            )}
            {tab === 'advanced' && (
                <AdvancedFields
                    advanced={current.advanced}
                    onChange={(advanced) =>
                        onLookChange(
                            serializeLook({
                                ...current,
                                advanced: advanced ?? undefined,
                            }),
                        )
                    }
                />
            )}
        </div>
    );
}
