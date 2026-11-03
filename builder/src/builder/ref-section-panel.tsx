import { ArrowDown, ArrowUp, Eye, EyeOff, RefreshCw, Trash2 } from 'lucide-react';
import { useT } from '@/lib/i18n';
import type { RefSection } from '@/types';
import { ActionButton } from './action-button';
import { useBuilderContext } from './builder-context';

/**
 * A picked synced section. Its words live in the synced section itself,
 * so here it can only be hidden, moved and deleted.
 */
export function RefSectionPanel({
    block,
    index,
}: {
    block: RefSection;
    index: number;
}) {
    const t = useT();
    const { builder, onDeleteSection } = useBuilderContext();
    const isHidden = block.hidden === true;
    const count = builder.blocks.length;

    return (
        <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--builder-select)] text-white shadow-sm">
                    <RefreshCw className="size-5" />
                </span>
                <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-semibold">
                        {t('Synced')}
                    </p>
                    <p className="text-muted-foreground text-xs">
                        {t('Section :number of :count', {
                            number: index + 1,
                            count,
                        })}{' '}
                        · #{String(block.ref)}
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
                <span className="flex-1" />
                <ActionButton
                    label={t('Delete section')}
                    destructive
                    onClick={() => onDeleteSection(block.id)}
                >
                    <Trash2 />
                </ActionButton>
            </div>

            <p className="bg-muted/60 text-muted-foreground rounded-xl p-3 text-sm leading-relaxed">
                {t(
                    'This section is the same on every page that uses it. Change it where the synced section is kept.',
                )}
            </p>
        </div>
    );
}
