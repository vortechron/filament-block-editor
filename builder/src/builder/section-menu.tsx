import { BookmarkPlus, Ellipsis, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import type { RichSection } from '@/types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { SaveSectionDialog, type SaveSectionMode } from './save-section-dialog';

/**
 * Whether a section may be made synced. Never inside a synced section's
 * own builder (host kind "section"): that section already is the synced
 * one, and a synced section inside it would not be drawn (only one level
 * is followed, docs/v2-plan.md, section 5). A locked section only by a
 * developer, because the synced section takes its place and its locks.
 */
export function mayMakeSynced(kind: string | undefined, developer: boolean, isLocked: boolean): boolean {
    return kind !== 'section' && (developer || !isLocked);
}

/**
 * More things to do with a section, when the host can keep sections
 * (`adapter.saveSection`): save it as a template, or make it synced. A
 * locked section is only made synced by a developer, because the synced
 * section takes its place and its locks.
 */
export function SectionMenu({ block }: { block: RichSection }) {
    const t = useT();
    const { adapter, developer, kind } = useHost();
    const [mode, setMode] = useState<SaveSectionMode | null>(null);

    if (typeof adapter.saveSection !== 'function') {
        return null;
    }

    const canMakeSynced = mayMakeSynced(kind, developer, block.lock !== undefined);

    return (
        <>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label={t('More for this section')}
                        title={t('More for this section')}
                        className="text-muted-foreground hover:bg-card hover:text-foreground grid size-8 place-items-center rounded-lg transition-colors hover:shadow-sm [&_svg]:size-4"
                    >
                        <Ellipsis />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuItem onSelect={() => setMode('template')}>
                        <BookmarkPlus />
                        {t('Save a copy')}
                    </DropdownMenuItem>
                    {canMakeSynced && (
                        <DropdownMenuItem onSelect={() => setMode('synced')}>
                            <RefreshCw />
                            {t('Make synced')}
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            <SaveSectionDialog mode={mode} section={block} onClose={() => setMode(null)} />
        </>
    );
}
