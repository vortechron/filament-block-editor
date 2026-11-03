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
 * its advanced settings, both kept in the block's `look` prop.
 */
export function ItemTabs({
    look,
    onLookChange,
    children,
}: {
    /** The block's `look` prop. */
    look: unknown;
    onLookChange: (look: string) => void;
    /** The item's own settings. */
    children: ReactNode;
}) {
    const t = useT();
    const [tab, setTab] = useState<ItemTab>('settings');
    const current = parseLook(look);

    return (
        <div className="grid grid-cols-1 gap-5">
            <div
                role="tablist"
                aria-label={t('Item settings')}
                className="grid grid-cols-3 border-b"
            >
                {TABS.map(({ name, label, icon: Icon }) => (
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
