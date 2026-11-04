import {
    DndContext,
    type DragMoveEvent,
    DragOverlay,
    type DragStartEvent,
    MouseSensor,
    TouchSensor,
    useDraggable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { LucideIcon } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useBuilderContext } from './builder-context';
import { dropPlaces, type Point } from './drop-places';
import { builderApp, liveFrame, pageSections } from './frame-dom';
import { nearestPlace, type Row } from './page-frame-updates';
import type { ItemKey, ItemPlace, PagePlace } from './types';

/** What is being dragged out of the Add panel. */
export type DragData =
    | { kind: 'item'; key: ItemKey; label: string; icon: LucideIcon }
    | {
          kind: 'template';
          templateKey: string;
          label: string;
          icon: LucideIcon;
      }
    | {
          kind: 'synced';
          ref: number | string;
          label: string;
          icon: LucideIcon;
      };

/** A whole section being dragged: a template or a synced section. */
type SectionDrag = Exclude<DragData, { kind: 'item' }>;

type Line = { top: number; left: number; width: number };

type DropTarget =
    | {
          kind: 'item';
          sectionId: string;
          place: ItemPlace | PagePlace;
          line: Line;
      }
    | {
          kind: 'section';
          /**
           * The section it goes in front of, or null for the end. Hidden
           * sections are not on the page, so a place counted on the page
           * would be wrong.
           */
          beforeSectionId: string | null;
          line: Line;
      };

/** The page scrolls by itself when a drag comes this close to an edge. */
const SCROLL_EDGE = 72;
const SCROLL_STEP = 14;

// A drag ends with the pointer let go over the tile it started on, which
// the browser may read as a tap. Tiles ignore taps this soon after a drag.
let lastDragEndedAt = 0;

export function wasJustDragged(): boolean {
    return Date.now() - lastDragEndedAt < 300;
}

/**
 * Lets the user drag a ready-made section or an item from the sidebar
 * onto the page on the canvas, or an item into the section's words in the
 * sidebar. A blue line shows where it lands. The line is worked out from
 * the page itself (its sections and the items the server marked) instead
 * of from drop zones.
 */
export function BuilderDragAndDrop({ children }: { children: ReactNode }) {
    const { builder, templates } = useBuilderContext();
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
        // A short press first, so a swipe still scrolls the sidebar.
        useSensor(TouchSensor, {
            activationConstraint: { delay: 220, tolerance: 8 },
        }),
    );
    const [active, setActive] = useState<DragData | null>(null);
    const [target, setTarget] = useState<DropTarget | null>(null);
    const start = useRef<Point>({ x: 0, y: 0 });
    const pointer = useRef<Point | null>(null);

    // Scroll the page while the pointer rests near its top or bottom.
    useEffect(() => {
        if (active === null) {
            return;
        }

        const timer = window.setInterval(() => {
            const page = pageElement();
            const view = liveFrame()?.contentWindow;
            const at = pointer.current;

            if (!page || !view || !at) {
                return;
            }

            const box = page.getBoundingClientRect();
            const step =
                at.y < box.top + SCROLL_EDGE
                    ? -SCROLL_STEP
                    : at.y > box.bottom - SCROLL_EDGE
                      ? SCROLL_STEP
                      : 0;

            if (step !== 0 && at.x >= box.left && at.x <= box.right) {
                view.scrollBy({ top: step, behavior: 'instant' });
                setTarget(findTarget(at, active));
            }
        }, 16);

        return () => window.clearInterval(timer);
    }, [active]);

    function handleStart(event: DragStartEvent) {
        start.current = startPoint(event.activatorEvent);
        pointer.current = start.current;
        // The page is an iframe, which would keep the pointer to itself.
        builderApp()?.setAttribute('data-builder-dragging', '');
        setActive((event.active.data.current as DragData | undefined) ?? null);
    }

    function handleMove(event: DragMoveEvent) {
        if (active === null) {
            return;
        }

        const at = {
            x: start.current.x + event.delta.x,
            y: start.current.y + event.delta.y,
        };

        pointer.current = at;
        setTarget(findTarget(at, active));
    }

    /** Adds a dragged template or synced section in front of a section. */
    function dropSection(data: SectionDrag, beforeSectionId: string | null) {
        const before =
            beforeSectionId === null
                ? -1
                : builder.blocks.findIndex(
                      (block) => block.id === beforeSectionId,
                  );
        const index = before === -1 ? builder.blocks.length : before;

        if (data.kind === 'synced') {
            builder.addSyncedSection(data.ref, index);

            return;
        }

        const template = templates.find(
            (entry) => entry.key === data.templateKey,
        );

        if (template) {
            builder.addSection(template, index);
        }
    }

    function finish(shouldDrop: boolean) {
        if (shouldDrop && target !== null && active !== null) {
            if (target.kind === 'section' && active.kind !== 'item') {
                dropSection(active, target.beforeSectionId);
            }

            if (target.kind === 'item' && active.kind === 'item') {
                builder.addItem(active.key, {
                    sectionId: target.sectionId,
                    place: target.place,
                });
            }
        }

        lastDragEndedAt = Date.now();
        builderApp()?.removeAttribute('data-builder-dragging');
        pointer.current = null;
        setActive(null);
        setTarget(null);
    }

    return (
        <DndContext
            sensors={sensors}
            autoScroll={false}
            onDragStart={handleStart}
            onDragMove={handleMove}
            onDragEnd={() => finish(true)}
            onDragCancel={() => finish(false)}
        >
            {children}
            <DragOverlay dropAnimation={null} className="pointer-events-none">
                {active && <DragPreview data={active} />}
            </DragOverlay>
            {active && target && <DropLine target={target} />}
        </DndContext>
    );
}

/** Makes a sidebar tile draggable onto the page. */
export function useCatalogDrag(id: string, data: DragData) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id,
        data,
    });

    return {
        ref: setNodeRef,
        isDragging,
        dragProps: { ...attributes, ...listeners },
    };
}

function DragPreview({ data }: { data: DragData }) {
    const Icon = data.icon;

    return (
        <div className="bg-popover text-popover-foreground flex w-max -translate-x-1/4 rotate-[-3deg] items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold shadow-[0_12px_32px_-8px_rgb(15_23_42/0.45)] ring-2 ring-[var(--builder-select)]">
            <Icon className="size-4 text-[var(--builder-select)]" />
            {data.label}
        </div>
    );
}

function DropLine({ target }: { target: DropTarget }) {
    const t = useT();
    const { line } = target;
    const isSection = target.kind === 'section';

    return (
        <div
            aria-hidden="true"
            className="pointer-events-none fixed z-[60] flex items-center"
            style={{ top: line.top - 2, left: line.left, width: line.width }}
        >
            <span className="size-2.5 shrink-0 -translate-x-1 rounded-full border-2 border-[var(--builder-select)] bg-white" />
            <span
                className={cn(
                    'flex-1 rounded-full bg-[var(--builder-select)]',
                    isSection ? 'h-1' : 'h-0.5',
                )}
            />
            <span className="size-2.5 shrink-0 translate-x-1 rounded-full border-2 border-[var(--builder-select)] bg-white" />
            {isSection && (
                <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-[var(--builder-select)] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow">
                    {t('Drop the section here')}
                </span>
            )}
        </div>
    );
}

/** The box on the canvas that holds the page. */
function pageElement(): HTMLElement | null {
    return document.querySelector<HTMLElement>('[data-canvas-page]');
}

function startPoint(event: Event): Point {
    if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) {
        const touch = event.touches[0] ?? event.changedTouches[0];

        return { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };
    }

    const mouse = event as MouseEvent;

    return { x: mouse.clientX, y: mouse.clientY };
}

function findTarget(at: Point, data: DragData): DropTarget | null {
    if (data.kind === 'item') {
        const words = [
            ...document.querySelectorAll<HTMLElement>('[data-section-editor]'),
        ].find(
            (element) =>
                element.offsetParent !== null &&
                contains(element.getBoundingClientRect(), at),
        );

        if (words) {
            return wordsTarget(at, words);
        }
    }

    const page = pageElement();

    if (!page || !contains(page.getBoundingClientRect(), at)) {
        return null;
    }

    const empty = page.querySelector<HTMLElement>('[data-canvas-drop-end]');

    if (empty) {
        const rect = empty.getBoundingClientRect();

        return data.kind !== 'item'
            ? {
                  kind: 'section',
                  beforeSectionId: null,
                  line: lineAt(rect, rect.top + 8),
              }
            : null;
    }

    const frame = liveFrame();
    const shown = frame?.contentDocument;
    const sections = shown ? pageSections(shown) : [];

    if (!frame || sections.length === 0) {
        return null;
    }

    const toWindow = frameToWindow(frame);
    const boxes = sections.map((section) => ({
        section,
        rect: toWindow(section.getBoundingClientRect()),
    }));

    return data.kind === 'item'
        ? pageItemTarget(at, boxes, toWindow)
        : sectionTarget(at, boxes);
}

type SectionBox = { section: HTMLElement; rect: DOMRect };

/** The gap between two sections on the page nearest the pointer. */
function sectionTarget(at: Point, boxes: SectionBox[]): DropTarget {
    for (const { section, rect } of boxes) {
        if (at.y < rect.top + rect.height / 2) {
            return {
                kind: 'section',
                beforeSectionId: section.getAttribute('data-block-id'),
                line: lineAt(rect, rect.top),
            };
        }
    }

    const last = boxes[boxes.length - 1].rect;

    return {
        kind: 'section',
        beforeSectionId: null,
        line: lineAt(last, last.bottom),
    };
}

/**
 * The place between two items, in the section under the pointer on the
 * page: the blocks the server marked with `data-item`, inside the column
 * under the pointer when there is one (dropPlaces()).
 */
function pageItemTarget(
    at: Point,
    boxes: SectionBox[],
    toWindow: (rect: DOMRect) => DOMRect,
): DropTarget {
    const { section, rect } =
        boxes.find(({ rect: box }) => at.y >= box.top && at.y <= box.bottom) ??
        boxes.reduce((best, box) =>
            distanceTo(box.rect, at.y) < distanceTo(best.rect, at.y)
                ? box
                : best,
        );
    const sectionId = section.getAttribute('data-block-id') ?? '';
    const items = dropPlaces(section, at, (element) =>
        toWindow(element.getBoundingClientRect()),
    );

    const place = nearestPlace(
        [...items].map(([key, box]) => rowOf(key, box)),
        at,
    );
    const box = place ? items.get(place.key) : undefined;

    if (!place || !box) {
        return {
            kind: 'item',
            sectionId,
            place: { blockId: null },
            line: lineAt(rect, rect.top + rect.height / 2),
        };
    }

    return {
        kind: 'item',
        sectionId,
        place: { path: place.key, placement: place.placement },
        line: lineAt(box, place.placement === 'before' ? box.top : box.bottom),
    };
}

/** The place between two items in the section's words in the sidebar. */
function wordsTarget(at: Point, words: HTMLElement): DropTarget {
    const sectionId = words.getAttribute('data-section-editor') ?? '';
    const blocks = [
        ...words.querySelectorAll<HTMLElement>(
            '.bn-editor > .bn-block-group > .bn-block-outer[data-id]',
        ),
    ].map((block) => ({
        id: block.getAttribute('data-id') ?? '',
        rect: block.getBoundingClientRect(),
    }));
    const place = nearestPlace(
        blocks.map(({ id, rect }) => rowOf(id, rect)),
        at,
    );
    const block = blocks.find(({ id }) => id === place?.key);

    if (!place || !block) {
        const rect = words.getBoundingClientRect();

        return {
            kind: 'item',
            sectionId,
            place: { blockId: null },
            line: lineAt(rect, rect.top + rect.height / 2),
        };
    }

    return {
        kind: 'item',
        sectionId,
        place: { blockId: place.key, placement: place.placement },
        line: lineAt(
            block.rect,
            place.placement === 'before' ? block.rect.top : block.rect.bottom,
        ),
    };
}

/**
 * Turns a box inside the page into the builder window's coordinates. The
 * page may be drawn smaller than its real width (see canvas.tsx), so the
 * box is scaled the same way.
 */
function frameToWindow(frame: HTMLIFrameElement) {
    const offset = frame.getBoundingClientRect();
    const scale = frame.offsetWidth > 0 ? offset.width / frame.offsetWidth : 1;

    return (rect: DOMRect) =>
        new DOMRect(
            offset.left + rect.left * scale,
            offset.top + rect.top * scale,
            rect.width * scale,
            rect.height * scale,
        );
}

function rowOf(key: string, rect: DOMRect): Row {
    return {
        key,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
    };
}

function contains(rect: DOMRect, at: Point): boolean {
    return (
        at.x >= rect.left &&
        at.x <= rect.right &&
        at.y >= rect.top &&
        at.y <= rect.bottom
    );
}

function distanceTo(rect: DOMRect, y: number): number {
    if (y < rect.top) {
        return rect.top - y;
    }

    return y > rect.bottom ? y - rect.bottom : 0;
}

function lineAt(rect: DOMRect, top: number): Line {
    return { top, left: rect.left, width: rect.width };
}
