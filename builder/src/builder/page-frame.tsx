import { LoaderCircle, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useDraftPreview } from '../editor/use-draft-preview';
import { frameSection, revealInFrame, runPendingScroll } from './frame-dom';
import {
    applyMarks,
    FRAME_STYLES,
    type FrameMarks,
    type FramePick,
    pickAt,
} from './frame-marks';
import { type PageDrawing, planUpdate } from './page-frame-updates';

export type { FramePick } from './frame-marks';

type FrameIndex = 0 | 1;

/** How long a new page may load the photos in view before it shows. */
const PHOTO_WAIT_MS = 400;

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
    kit = null,
    reloads = 0,
    marks,
    onPick,
}: {
    /** The page value as JSON. */
    draft: string;
    /** The design kit as JSON, with changes not saved yet, or null. */
    kit?: string | null;
    /** Draws the page again when it goes up, like after the shop info is saved. */
    reloads?: number;
    /**
     * What to mark on the page. Below 1, `scale` draws the page wider than
     * the canvas and shrinks it to fit, so it keeps the layout it has on a
     * laptop.
     */
    marks: FrameMarks;
    onPick: (pick: FramePick) => void;
}) {
    const t = useT();
    const { html, isUpdating, isStale } = useDraftPreview(draft, kit, reloads);
    const { pickedSectionId, pickedItemPath, scale } = marks;
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
    const latest = useRef({ onPick, marks });

    useEffect(() => {
        latest.current = { onPick, marks };
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
                applyMarks(page, latest.current.marks);
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
        applyMarks(page, latest.current.marks);

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

        latest.current.onPick(pickAt(target));
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

        applyMarks(page, marks);

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
    }, [live, updates, marks, pickedSectionId, pickedItemPath]);

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
