import { LoaderCircle, Smartphone, TriangleAlert } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useDraftPreview } from './use-draft-preview';

/**
 * Marks the section being edited inside the preview, and scrolls
 * to it when asked. Returns false when the section is not in the page yet.
 */
function showEditing(
    frame: HTMLIFrameElement | null,
    blockId: string | null,
    shouldScroll: boolean,
): boolean {
    const page = frame?.contentDocument;
    const view = frame?.contentWindow;

    if (!page || !view) {
        return false;
    }

    page.querySelectorAll('[data-editing]').forEach((element) =>
        element.removeAttribute('data-editing'),
    );

    const section = blockId
        ? page.querySelector(`[data-block-id="${CSS.escape(blockId)}"]`)
        : null;

    if (!section) {
        return false;
    }

    section.setAttribute('data-editing', '');

    // Not scrollIntoView(): that would scroll the editor around the
    // preview too.
    if (shouldScroll) {
        view.scrollTo({
            top: section.getBoundingClientRect().top + view.scrollY,
            behavior: 'smooth',
        });
    }

    return true;
}

/**
 * The page as visitors see it, with the changes that are not saved yet.
 * It updates a moment after the user stops typing, keeps its scroll
 * place, and scrolls to the section being edited.
 */
export function LivePreview({
    draft,
    kit = null,
    editingBlockId,
    className,
    frameClassName,
}: {
    /** The page value as JSON. */
    draft: string;
    /** The design kit as JSON, with changes not saved yet, or null. */
    kit?: string | null;
    editingBlockId: string | null;
    className?: string;
    frameClassName?: string;
}) {
    const t = useT();
    const { html, isUpdating, isStale } = useDraftPreview(draft, kit);
    const frameRef = useRef<HTMLIFrameElement>(null);
    const scrollTop = useRef(0);
    // The section the preview last scrolled to, so it scrolls once per section.
    const scrolledTo = useRef<string | null>(null);

    useEffect(() => {
        const shouldScroll = scrolledTo.current !== editingBlockId;

        if (showEditing(frameRef.current, editingBlockId, shouldScroll)) {
            scrolledTo.current = editingBlockId;
        }
    }, [editingBlockId]);

    function handleLoad() {
        const view = frameRef.current?.contentWindow;

        if (!view) {
            return;
        }

        // A new version replaces the whole page. Put the user back where
        // they were, without the page's smooth scrolling.
        view.scrollTo({ top: scrollTop.current, behavior: 'instant' });
        view.addEventListener(
            'scroll',
            () => {
                scrollTop.current = view.scrollY;
            },
            { passive: true },
        );

        // A section added a moment ago only appears now.
        const shouldScroll = scrolledTo.current !== editingBlockId;

        if (showEditing(frameRef.current, editingBlockId, shouldScroll)) {
            scrolledTo.current = editingBlockId;
        }
    }

    return (
        <aside
            aria-label={t('Page preview')}
            className={cn('grid grid-cols-1 gap-2', className)}
        >
            <div className="flex min-h-7 items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-medium">
                    <Smartphone className="size-4" />
                    {t('Live preview')}
                </p>
                {isUpdating && html !== null && (
                    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <LoaderCircle className="size-3.5 animate-spin" />
                        {t('Updating')}
                    </span>
                )}
                {isStale && !isUpdating && (
                    <span className="text-warning flex items-center gap-1.5 text-xs">
                        <TriangleAlert className="size-3.5" />
                        {t('Fix the problem to update')}
                    </span>
                )}
            </div>
            <div
                className={cn(
                    'relative overflow-hidden rounded-xl border bg-white shadow-sm',
                    frameClassName,
                )}
            >
                {html === null ? (
                    <div className="text-muted-foreground absolute inset-0 grid place-items-center text-sm">
                        <span className="flex items-center gap-2">
                            <LoaderCircle className="size-4 animate-spin" />
                            {t('Loading your page')}
                        </span>
                    </div>
                ) : (
                    <iframe
                        ref={frameRef}
                        title={t('Preview of your page')}
                        srcDoc={html}
                        onLoad={handleLoad}
                        className="size-full"
                    />
                )}
            </div>
            <p className="text-muted-foreground text-xs">
                {t('Shows your changes as you type. Press Save to keep them.')}
            </p>
        </aside>
    );
}
