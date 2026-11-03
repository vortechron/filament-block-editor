import { Lock, LockOpen } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { LOCK_KEYS, withLock } from '@/lib/locks';
import { cn } from '@/lib/utils';
import type { LockKey, RichSection } from '@/types';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { useBuilderContext } from './builder-context';

const LABELS: Record<LockKey, { label: string; hint: string }> = {
    move: { label: 'Moving', hint: 'It stays in its place.' },
    remove: { label: 'Removing', hint: 'It can not be deleted or hidden.' },
    content: { label: 'Content', hint: 'Its words and items stay as they are.' },
    style: { label: 'Style', hint: 'Its look, style and advanced settings stay.' },
};

/**
 * Developers only: what others may not do to this section. The server
 * keeps the locks too, whatever another user sends.
 */
export function LockMenu({ block }: { block: RichSection }) {
    const t = useT();
    const { builder } = useBuilderContext();
    const isLocked = block.lock !== undefined;
    const Icon = isLocked ? Lock : LockOpen;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={t('Lock')}
                    title={t('Lock')}
                    className={cn(
                        'text-muted-foreground hover:bg-card hover:text-foreground grid size-8 place-items-center rounded-lg transition-colors hover:shadow-sm [&_svg]:size-4',
                        isLocked && 'bg-card text-foreground shadow-sm',
                    )}
                >
                    <Icon />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="grid gap-0.5">
                    {t('Lock this section')}
                    <span className="text-muted-foreground text-xs font-normal">
                        {t('Only developers can change what is locked.')}
                    </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {LOCK_KEYS.map((key) => (
                    <DropdownMenuCheckboxItem
                        key={key}
                        aria-label={t(LABELS[key].label)}
                        checked={block.lock?.[key] === true}
                        onCheckedChange={(on) =>
                            builder.updateSection(block.id, (current) =>
                                current.type === 'rich'
                                    ? withLock(current, key, on === true)
                                    : current,
                            )
                        }
                        className="items-start py-2"
                    >
                        <span className="grid gap-0.5">
                            <span>{t(LABELS[key].label)}</span>
                            <span className="text-muted-foreground text-xs">
                                {t(LABELS[key].hint)}
                            </span>
                        </span>
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
