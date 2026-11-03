import { Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { PageValue } from '@/types';

/** How long the note shows after a delete. */
export const DELETE_NOTE_MS = 6000;

export type DeletedKind = 'section' | 'item';

/**
 * The note after a section or an item is deleted, with an Undo button.
 * It shows for DELETE_NOTE_MS, and only while the page is still as the
 * delete left it: after any other change its Undo would undo that one.
 * Show it only when the delete recorded a step (stepCount went up).
 */
export function useDeleteNote(page: PageValue) {
    const [note, setNote] = useState<{ kind: DeletedKind; page: PageValue } | null>(null);

    useEffect(() => {
        if (note === null) {
            return;
        }

        const timer = window.setTimeout(() => setNote(null), DELETE_NOTE_MS);

        return () => window.clearTimeout(timer);
    }, [note]);

    return {
        kind: note !== null && note.page === page ? note.kind : null,
        /** After a delete that left the page as `page`. */
        show: (kind: DeletedKind, page: PageValue) => setNote({ kind, page }),
        hide: () => setNote(null),
    };
}

/**
 * "Section deleted · Undo" at the bottom of the canvas, above the phone's
 * bar. The live region stays in place, so screen readers read the note
 * when it comes.
 */
export function DeleteNote({
    kind,
    isPhone,
    isRaised,
    onUndo,
}: {
    kind: DeletedKind | null;
    isPhone: boolean;
    /** The hidden section note is at the bottom too: sit above it. */
    isRaised: boolean;
    onUndo: () => void;
}) {
    const t = useT();

    return (
        <div
            role="status"
            data-undo-note=""
            className={cn(
                'pointer-events-none absolute inset-x-0 z-[45] flex justify-center px-4',
                isPhone
                    ? 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))]'
                    : isRaised
                      ? 'bottom-20'
                      : 'bottom-8',
            )}
        >
            {kind !== null && (
                <div className="animate-in fade-in-0 slide-in-from-bottom-2 pointer-events-auto flex items-center gap-2 rounded-full bg-neutral-900/90 py-1 pr-1 pl-4 text-sm font-medium text-white shadow-lg">
                    <span>{kind === 'section' ? t('Section deleted') : t('Item deleted')}</span>
                    <span aria-hidden="true" className="text-white/50">
                        ·
                    </span>
                    <button
                        type="button"
                        onClick={onUndo}
                        className="flex h-10 items-center gap-1.5 rounded-full px-3 font-semibold hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none md:h-8"
                    >
                        <Undo2 className="size-4" />
                        {t('Undo')}
                    </button>
                </div>
            )}
        </div>
    );
}
