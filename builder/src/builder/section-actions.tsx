import { ArrowDown, ArrowUp, CopyPlus, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useT } from '@/lib/i18n';
import type { RichSection } from '@/types';
import { ActionButton } from './action-button';
import { useBuilderContext } from './builder-context';

/** The picked section's buttons: hide, move, copy and delete. */
export function SectionActions({
    block,
    index,
}: {
    block: RichSection;
    index: number;
}) {
    const t = useT();
    const { builder, onDeleteSection } = useBuilderContext();
    const isHidden = block.hidden === true;
    const count = builder.blocks.length;

    return (
        <div className="bg-muted/60 flex items-center gap-1 rounded-xl border p-1">
            <ActionButton
                label={isHidden ? t('Show on the page') : t('Hide from the page')}
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
            <ActionButton
                label={t('Duplicate')}
                disabled={!builder.canAddSection}
                onClick={() => builder.duplicateSection(block.id)}
            >
                <CopyPlus />
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
    );
}
