import { type KeyboardEvent, type PointerEvent, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** How far one arrow key press moves the edge. */
const STEP = 16;

/**
 * The edge between the editor panel and the page: drag it to make the
 * panel wider or narrower. The arrow keys move it too, and Home puts it
 * back. While dragging, a cover keeps the page frame from taking the
 * pointer.
 */
export function SidebarResizer({
    width,
    onResize,
    onDone,
    onReset,
}: {
    width: number;
    /** While dragging: not kept yet. */
    onResize: (width: number, keep: boolean) => void;
    /** The drag ended: keep the width. */
    onDone: () => void;
    onReset: () => void;
}) {
    const t = useT();
    const start = useRef<{ x: number; width: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        start.current = { x: event.clientX, width };
        setIsDragging(true);
    }

    function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
        if (start.current !== null) {
            onResize(start.current.width + event.clientX - start.current.x, false);
        }
    }

    function handlePointerUp() {
        if (start.current !== null) {
            start.current = null;
            setIsDragging(false);
            onDone();
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            onResize(width + (event.key === 'ArrowRight' ? STEP : -STEP), true);
        } else if (event.key === 'Home') {
            event.preventDefault();
            onReset();
        }
    }

    return (
        <>
            <div
                role="separator"
                aria-orientation="vertical"
                aria-label={t('Resize the editor panel')}
                aria-valuenow={width}
                tabIndex={0}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onDoubleClick={onReset}
                onKeyDown={handleKeyDown}
                title={t('Drag to resize. Double-tap to reset.')}
                className={cn(
                    'group relative z-20 -mx-1.5 w-3 shrink-0 cursor-col-resize touch-none outline-none',
                    'after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:transition-colors',
                    'hover:after:bg-[var(--builder-select)] focus-visible:after:bg-[var(--builder-select)]',
                    isDragging && 'after:bg-[var(--builder-select)]',
                )}
            />
            {isDragging && (
                <div
                    aria-hidden="true"
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="fixed inset-0 z-50 cursor-col-resize"
                />
            )}
        </>
    );
}
