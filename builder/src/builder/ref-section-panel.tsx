import {
    ArrowDown,
    ArrowUp,
    Eye,
    EyeOff,
    RefreshCw,
    Trash2,
    Unlink,
} from 'lucide-react';
import { useState } from 'react';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { withoutDeveloperData } from '@/lib/locks';
import { newSectionId } from '@/lib/page-value';
import { findSynced } from '@/lib/synced-sections';
import type { RefSection, RichSection } from '@/types';
import { ConfirmDialog } from '../editor/confirm-dialog';
import { ActionButton } from './action-button';
import { useBuilderContext } from './builder-context';
import { EditElsewhereLink } from './edit-elsewhere-link';
import { sectionTitle } from './section-meta';

/**
 * A picked synced section. Its words live in the synced section itself,
 * so here it can be hidden, moved and deleted, edited where it is kept
 * (its `editUrl`), or detached: this page then gets its own copy.
 */
export function RefSectionPanel({
    block,
    index,
}: {
    block: RefSection;
    index: number;
}) {
    const t = useT();
    const { developer, ownBlocks } = useHost();
    const { builder, library, onDeleteSection } = useBuilderContext();
    const [isDetaching, setIsDetaching] = useState(false);
    const synced = findSynced(library.synced, block.ref);
    const isHidden = block.hidden === true;
    const count = builder.blocks.length;

    function detach(section: RichSection) {
        const copy = developer ? section : withoutDeveloperData(section);

        builder.replaceSection(block.id, {
            ...structuredClone(copy),
            id: newSectionId(),
            ...(isHidden ? { hidden: true as const } : {}),
        });
    }

    return (
        <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--builder-select)] text-white shadow-sm">
                    <RefreshCw className="size-5" />
                </span>
                <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-semibold">
                        {sectionTitle(block, t, { synced: library.synced, ownBlocks })}
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

            <div className="bg-muted/60 text-muted-foreground grid gap-1 rounded-xl p-3 text-sm leading-relaxed">
                <p>{t('This section is shared. Every page that uses it shows the same words.')}</p>
                {!synced?.editUrl && <p>{t('Change it where the synced section is kept.')}</p>}
            </div>

            {synced?.editUrl && (
                <EditElsewhereLink href={synced.editUrl} label={t('Edit synced section')} />
            )}

            <button
                type="button"
                disabled={!synced || !builder.canAddSection}
                onClick={() => setIsDetaching(true)}
                className="bg-card flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium hover:border-[var(--builder-select)] hover:text-[var(--builder-select)] disabled:opacity-40"
            >
                <Unlink className="size-4" />
                {t('Detach')}
            </button>
            {!synced && (
                <p className="text-muted-foreground text-xs">
                    {t('This page does not have the synced section’s words, so it can not be detached here.')}
                </p>
            )}

            <ConfirmDialog
                open={isDetaching}
                onOpenChange={setIsDetaching}
                title={t('Detach this section?')}
                description={t(
                    'This page gets its own copy to change. Changes to the synced section no longer show here.',
                )}
                confirmLabel={t('Detach')}
                onConfirm={() => {
                    setIsDetaching(false);

                    if (synced) {
                        detach(synced.section);
                    }
                }}
            />
        </div>
    );
}
