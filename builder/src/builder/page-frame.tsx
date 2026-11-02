import { LoaderCircle, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useDraftPreview } from '../editor/use-draft-preview';
import {
    frameItem,
    frameSection,
    revealInFrame,
    runPendingScroll,
} from './frame-dom';
import { type PageDrawing, planUpdate } from './page-frame-updates';

/** What a click on the page picked. */
export type FramePick =
    | { kind: 'section'; sectionId: string; path: string | null }
    | { kind: 'nothing' };

type FrameIndex = 0 | 1;

/** How long a new page may load the photos in view before it shows. */
const PHOTO_WAIT_MS = 400;

/**
 * The builder's marks inside the page: a dashed frame on hover, a blue
 * frame and a label on the picked section, and a frame on the picked item.
 */
const FRAME_STYLES = `
[data-preview-banner] { display: none !important; }
[data-block-id] { position: relative; cursor: pointer; }
[data-block-id]:has(*)::before {
    content: ''; position: absolute; inset: 0; z-index: 59;
    border: calc(1px * var(--builder-ui, 1)) dashed transparent;
    pointer-events: none; transition: border-color 0.15s;
}
[data-block-id]:hover::before { border-color: rgb(37 99 235 / 0.75); }
[data-block-id][data-builder-picked]::before { border: calc(2px * var(--builder-ui, 1)) solid #2563eb; }
[data-block-id]::after {
    content: attr(data-builder-label);
    position: absolute; top: 0; left: 0; z-index: 60;
    padding: calc(0.3rem * var(--builder-ui, 1)) calc(0.65rem * var(--builder-ui, 1));
    border-bottom-right-radius: calc(0.5rem * var(--builder-ui, 1));
    background: #2563eb; color: #fff;
    font: 600 calc(12px * var(--builder-ui, 1))/1.3 system-ui, -apple-system, sans-serif;
    letter-spacing: 0; text-transform: none;
    pointer-events: none; opacity: 0; transition: opacity 0.15s;
}
[data-block-id]:hover::after, [data-block-id][data-builder-picked]::after { opacity: 1; }
[data-builder-picked] [data-item]:hover { outline: 1px dashed rgb(37 99 235 / 0.6); outline-offset: 3px; }
[data-builder-picked-item] { outline: calc(2px * var(--builder-ui, 1)) solid #2563eb !important; outline-offset: 3px; }
`;

/**
 * The page on the canvas, drawn by the host exactly as visitors get it,
 * with the changes that are not saved yet. A click picks the section or
 * the item under it instead of following links.
 *
 * Typing changes one section, so only that section is swapped in place.
 * A bigger change loads the whole page in a second frame behind this one,
 * at the same scroll place, and shows it once it is ready, so the page
 * never flashes white.
 */
export function PageFrame({
    draft,
    pickedSectionId,
    pickedItemPath,
    sectionLabels,
    scale,
    onPick,
}: {
    /** The page value as JSON. */
    draft: string;
    pickedSectionId: string | null;
    /** The picked item's place in its section, as the page marks it. */
    pickedItemPath: string | null;
    /** The label on each section, like "3. Hero", by section id. */
    sectionLabels: ReadonlyMap<string, string>;
    /**
     * Below 1 the page is drawn wider than the canvas and shrunk to fit,
     * so it keeps the layout it has on a laptop.
     */
    scale: number;
    onPick: (pick: FramePick) => void;
}) {
    const t = useT();
    const { html, isUpdating, isStale } = useDraftPreview(draft);
    const frameA = useRef<HTMLIFrameElement>(null);
    const frameB = useRef<HTMLIFrameElement>(null);
    const [sources, setSources] = useState<[string | null, string | null]>([
        null,
        null,
    ]);
    const [live, setLive] = useState<FrameIndex | null>(null);
    // The same as `live`, for the listeners inside the page.
    const liveIndex = useRef<FrameIndex | null>(null);
    // Each whole-page load gets a number, so a slow old load never shows.
    const loadToken = useRef(0);
    const loadingInto = useRef<FrameIndex | null>(null);
    const drawn = useRef<PageDrawing | null>(null);
    const scrollTop = useRef(0);
    // The pick the page last scrolled to, so it scrolls once per pick.
    const revealedFor = useRef<string | null>(null);
    const [updates, setUpdates] = useState(0);
    const latest = useRef({
        onPick,
        sectionLabels,
        pickedSectionId,
        pickedItemPath,
        scale,
    });

    useEffect(() => {
        latest.current = {
            onPick,
            sectionLabels,
            pickedSectionId,
            pickedItemPath,
            scale,
        };
    });

    function frameAt(index: FrameIndex | null): HTMLIFrameElement | null {
        return index === null ? null : (index === 0 ? frameA : frameB).current;
    }

    useEffect(() => {
        if (html === null) {
            return;
        }

        const next = readDrawing(html);
        const plan =
            loadingInto.current === null
                ? planUpdate(drawn.current, next)
                : { kind: 'reload' as const };

        drawn.current = next;

        if (plan.kind === 'none') {
            return;
        }

        const frame = frameAt(liveIndex.current);

        if (
            plan.kind === 'swap' &&
            swapSections(frame, next, plan.sectionIds)
        ) {
            const page = frame?.contentDocument;

            if (page) {
                applyMarks(page, latest.current);
            }

            setUpdates((count) => count + 1);

            return;
        }

        const target: FrameIndex = liveIndex.current === 0 ? 1 : 0;

        loadToken.current += 1;
        loadingInto.current = target;
        // The number at the end also makes the frame load again when it
        // already holds this very page.
        setSources((current) =>
            target === 0
                ? [`${html}<!--builder:${loadToken.current}-->`, current[1]]
                : [current[0], `${html}<!--builder:${loadToken.current}-->`],
        );
    }, [html]);

    function handleLoad(index: FrameIndex) {
        const frame = frameAt(index);
        const page = frame?.contentDocument;
        const view = frame?.contentWindow;
        const token = loadToken.current;

        if (
            !page ||
            !view ||
            loadingInto.current !== index ||
            readToken(page) !== token
        ) {
            return;
        }

        preparePage(page, view, index);
        view.scrollTo({ top: scrollTop.current, behavior: 'instant' });

        void waitForPhotos(page, view).then(() => {
            if (loadToken.current !== token) {
                return;
            }

            loadingInto.current = null;
            liveIndex.current = index;
            setLive(index);
            setUpdates((count) => count + 1);
        });
    }

    /** Wires a newly loaded page to the builder. */
    function preparePage(page: Document, view: Window, index: FrameIndex) {
        const style = page.createElement('style');

        style.textContent = FRAME_STYLES;
        page.head.append(style);
        applyMarks(page, latest.current);

        page.addEventListener(
            'click',
            (event) => handleClick(event, index),
            true,
        );
        // The preview never sends a form.
        page.addEventListener(
            'submit',
            (event) => event.preventDefault(),
            true,
        );
        page.addEventListener('keydown', forwardShortcut);
        view.addEventListener(
            'scroll',
            () => {
                if (liveIndex.current === index) {
                    scrollTop.current = view.scrollY;
                }
            },
            { passive: true },
        );
    }

    function handleClick(event: MouseEvent, index: FrameIndex) {
        const target = event.target;

        if (liveIndex.current !== index || !isElement(target)) {
            return;
        }

        // Slideshow arrows and fold-outs still work; links and submit
        // buttons never leave the editor.
        if (
            target.closest('a[href], button[type="submit"]') &&
            !target.closest('[data-gallery-controls]')
        ) {
            event.preventDefault();
        }

        const section = target.closest('[data-block-id]');

        if (section) {
            latest.current.onPick({
                kind: 'section',
                sectionId: section.getAttribute('data-block-id') ?? '',
                path:
                    target.closest('[data-item]')?.getAttribute('data-item') ??
                    null,
            });
        } else {
            latest.current.onPick({ kind: 'nothing' });
        }
    }

    // A scroll that waited for this change, like to a moved section.
    useEffect(() => runPendingScroll(), [live, updates]);

    // The marks follow the pick, and the page scrolls to a pick that is
    // out of sight, like a section picked in the Structure list.
    useEffect(() => {
        const frame = frameAt(live);
        const page = frame?.contentDocument;

        if (!page) {
            return;
        }

        applyMarks(page, {
            sectionLabels,
            pickedSectionId,
            pickedItemPath,
            scale,
        });

        if (pickedSectionId === null) {
            revealedFor.current = null;

            return;
        }

        const pick = `${pickedSectionId}:${pickedItemPath ?? ''}`;

        if (
            revealedFor.current !== pick &&
            revealInFrame(frame, {
                sectionId: pickedSectionId,
                path: pickedItemPath,
            })
        ) {
            revealedFor.current = pick;
        }
    }, [
        live,
        updates,
        pickedSectionId,
        pickedItemPath,
        sectionLabels,
        scale,
    ]);

    return (
        <div className="absolute inset-0">
            <div
                className="absolute inset-0"
                style={
                    scale < 1
                        ? {
                              width: `${100 / scale}%`,
                              height: `${100 / scale}%`,
                              transform: `scale(${scale})`,
                              transformOrigin: '0 0',
                          }
                        : undefined
                }
            >
                {([0, 1] as const).map((index) => (
                    <iframe
                        key={index}
                        ref={index === 0 ? frameA : frameB}
                        title={t('Your page')}
                        srcDoc={sources[index] ?? undefined}
                        onLoad={() => handleLoad(index)}
                        data-builder-frame={live === index ? 'live' : 'loading'}
                        aria-hidden={live === index ? undefined : true}
                        tabIndex={live === index ? undefined : -1}
                        className={cn(
                            // During a drag the builder needs the pointer.
                            'absolute inset-0 size-full bg-white [[data-builder-dragging]_&]:pointer-events-none',
                            live !== index && 'pointer-events-none invisible',
                        )}
                    />
                ))}
            </div>

            {live === null && (
                <div className="text-muted-foreground absolute inset-0 grid place-items-center bg-white text-sm">
                    <span className="flex items-center gap-2">
                        <LoaderCircle className="size-4 animate-spin" />
                        {t('Loading your page')}
                    </span>
                </div>
            )}

            {live !== null && (isUpdating || isStale) && (
                <div className="pointer-events-none absolute top-3 right-3 z-10">
                    {isStale && !isUpdating ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 shadow-sm ring-1 ring-amber-200">
                            <TriangleAlert className="size-3.5" />
                            {t('Fix the problem to update')}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-900/10">
                            <LoaderCircle className="size-3.5 animate-spin" />
                            {t('Updating')}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

/** The page split into its sections and everything around them. */
function readDrawing(html: string): PageDrawing {
    const page = new DOMParser().parseFromString(html, 'text/html');
    const sections = new Map<string, string>();

    page.querySelectorAll<HTMLElement>('[data-block-id]').forEach((section) => {
        sections.set(section.dataset.blockId ?? '', section.innerHTML);
        section.replaceChildren();
    });

    return { frame: page.documentElement.outerHTML, sections };
}

/**
 * Puts the new HTML into the sections that changed, then lets the page's
 * own script start their slideshows again: it may listen for the
 * `page-builder:swap` event on the section, or expose
 * `window.pageBuilderPreview.refresh(section)`. False when a section is
 * missing.
 */
function swapSections(
    frame: HTMLIFrameElement | null,
    next: PageDrawing,
    sectionIds: string[],
): boolean {
    const sections = sectionIds.map((id) => frameSection(frame, id));

    if (sections.some((section) => section === null)) {
        return false;
    }

    sections.forEach((section, index) => {
        if (section) {
            section.innerHTML = next.sections.get(sectionIds[index]) ?? '';
            refreshSection(frame, section);
        }
    });

    return true;
}

function applyMarks(
    page: Document,
    marks: {
        sectionLabels: ReadonlyMap<string, string>;
        pickedSectionId: string | null;
        pickedItemPath: string | null;
        scale: number;
    },
) {
    // The labels and frames keep their size when the page is shrunk.
    page.documentElement.style.setProperty(
        '--builder-ui',
        String(1 / marks.scale),
    );

    page.querySelectorAll<HTMLElement>('[data-block-id]').forEach((section) => {
        const id = section.dataset.blockId ?? '';

        section.setAttribute(
            'data-builder-label',
            marks.sectionLabels.get(id) ?? '',
        );
        section.toggleAttribute(
            'data-builder-picked',
            id === marks.pickedSectionId,
        );
    });

    page.querySelectorAll('[data-builder-picked-item]').forEach((item) =>
        item.removeAttribute('data-builder-picked-item'),
    );

    if (marks.pickedSectionId !== null && marks.pickedItemPath !== null) {
        const section = page.querySelector<HTMLElement>(
            `[data-block-id="${CSS.escape(marks.pickedSectionId)}"]`,
        );

        frameItem(section, marks.pickedItemPath)?.setAttribute(
            'data-builder-picked-item',
            '',
        );
    }
}

type PreviewWindow = Window & {
    CustomEvent?: typeof CustomEvent;
    pageBuilderPreview?: { refresh?: (section: HTMLElement) => void };
};

function refreshSection(frame: HTMLIFrameElement | null, section: HTMLElement) {
    const view = frame?.contentWindow as PreviewWindow | null | undefined;

    section.dispatchEvent(
        new (view?.CustomEvent ?? CustomEvent)('page-builder:swap', {
            bubbles: true,
        }),
    );
    view?.pageBuilderPreview?.refresh?.(section);
}

/** Ctrl+S and Escape work while the page has the keyboard too. */
function forwardShortcut(event: KeyboardEvent) {
    const isSave =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';

    if (!isSave && event.key !== 'Escape') {
        return;
    }

    if (isSave) {
        event.preventDefault();
    }

    window.dispatchEvent(
        new KeyboardEvent('keydown', {
            key: event.key,
            metaKey: event.metaKey,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            cancelable: true,
        }),
    );
}

/** The load number written at the end of the page. */
function readToken(page: Document): number | null {
    const last = page.lastChild;
    const match =
        last?.nodeType === Node.COMMENT_NODE
            ? /^builder:(\d+)$/.exec(last.textContent ?? '')
            : null;

    return match ? Number(match[1]) : null;
}

/**
 * Waits a moment for the photos in view, so the page swaps in whole. It
 * never waits longer than PHOTO_WAIT_MS.
 */
function waitForPhotos(page: Document, view: Window): Promise<void> {
    const inView = [...page.images].filter((image) => {
        const box = image.getBoundingClientRect();

        return !image.complete && box.bottom > 0 && box.top < view.innerHeight;
    });
    const ready = Promise.all([
        ...inView.map((image) => image.decode().catch(() => undefined)),
        new Promise<void>((resolve) =>
            view.requestAnimationFrame(() =>
                view.requestAnimationFrame(() => resolve()),
            ),
        ),
    ]);
    const timeout = new Promise<void>((resolve) =>
        window.setTimeout(resolve, PHOTO_WAIT_MS),
    );

    return Promise.race([ready.then(() => undefined), timeout]);
}

/** Nodes from the page belong to another window, so instanceof fails. */
function isElement(target: EventTarget | null): target is Element {
    return (
        target !== null &&
        'nodeType' in target &&
        (target as Node).nodeType === Node.ELEMENT_NODE
    );
}
