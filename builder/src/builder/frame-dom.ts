/**
 * Reaches into the page on the canvas (page-frame.tsx) from the rest of
 * the builder: the builder state scrolls to a section, and the drag and
 * drop finds where an item lands. The page is a srcdoc iframe, so its
 * document can be read directly.
 */

/** A section, or one item in it, by its place in the document. */
export type FrameTarget = { sectionId: string; path: string | null };

/** The builder's own element, inside the element the host mounted it on. */
export function builderApp(): HTMLElement | null {
    return document.querySelector<HTMLElement>('[data-fbe-app]');
}

/** The iframe that shows the page now. A second one loads behind it. */
export function liveFrame(): HTMLIFrameElement | null {
    return document.querySelector<HTMLIFrameElement>(
        '[data-fbe-app] iframe[data-builder-frame="live"]',
    );
}

export function frameSection(
    frame: HTMLIFrameElement | null,
    sectionId: string,
): HTMLElement | null {
    return (
        frame?.contentDocument?.querySelector<HTMLElement>(
            `[data-block-id="${CSS.escape(sectionId)}"]`,
        ) ?? null
    );
}

export function frameItem(
    section: HTMLElement | null,
    path: string,
): HTMLElement | null {
    return (
        section?.querySelector<HTMLElement>(
            `[data-item="${CSS.escape(path)}"]`,
        ) ?? null
    );
}

/**
 * A scroll asked for before the page shows its target, like a section
 * added a moment ago. The canvas runs it after its next update.
 */
let pendingScroll: FrameTarget | null = null;

/**
 * Scrolls the page so the section (or the item) sits at the top. When it
 * is not on the page yet, it scrolls there as soon as it shows.
 */
export function scrollFrameTo(target: FrameTarget): void {
    pendingScroll = scrollNow(target) ? null : target;
}

/**
 * Scrolls to a section once the page shows the next change, like a
 * section that moved: the page still shows it in its old place now.
 */
export function followInFrame(target: FrameTarget): void {
    pendingScroll = target;
}

/** Runs a scroll that waited for the page to update. */
export function runPendingScroll(): void {
    if (pendingScroll !== null && scrollNow(pendingScroll)) {
        pendingScroll = null;
    }
}

/** Room above an item for its section's label. */
const LABEL_ROOM = 48;

/** Where the page scrolls to show a target, or null when it is not there. */
function locate(
    frame: HTMLIFrameElement | null,
    { sectionId, path }: FrameTarget,
): { view: Window; element: HTMLElement; top: number } | null {
    const view = frame?.contentWindow;
    const section = frameSection(frame, sectionId);
    const item = path === null ? null : frameItem(section, path);
    const element = item ?? section;

    if (!view || !element) {
        return null;
    }

    return {
        view,
        element,
        top:
            element.getBoundingClientRect().top +
            view.scrollY -
            (item ? LABEL_ROOM : 0),
    };
}

function scrollNow(target: FrameTarget): boolean {
    const spot = locate(liveFrame(), target);

    spot?.view.scrollTo({ top: spot.top, behavior: 'smooth' });

    return spot !== null;
}

/**
 * Scrolls only when the element is mostly out of sight, so a click on
 * the page never moves it. False when it is not on the page.
 */
export function revealInFrame(
    frame: HTMLIFrameElement | null,
    target: FrameTarget,
): boolean {
    const spot = locate(frame, target);

    if (spot === null) {
        return false;
    }

    const box = spot.element.getBoundingClientRect();
    const height = spot.view.innerHeight;
    const visible = Math.min(box.bottom, height) - Math.max(box.top, 0);

    if (visible < Math.min(box.height, height) * 0.5) {
        spot.view.scrollTo({ top: spot.top, behavior: 'smooth' });
    }

    return true;
}
