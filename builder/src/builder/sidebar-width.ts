import { useState } from 'react';

/** Where the width the user dragged the panel to is kept, in pixels. */
export const SIDEBAR_WIDTH_KEY = 'fbe-sidebar-width';

/** The narrowest the panel goes. */
export const MIN_SIDEBAR_WIDTH = 280;

/** The room always left for the page beside the panel. */
const PAGE_ROOM = 360;

/** The panel's width before anyone drags it: wider for a section or item. */
export function defaultSidebarWidth(isWidePanel: boolean): number {
    return isWidePanel ? 432 : 368;
}

/** A width the panel may take on a screen this wide. */
export function clampSidebarWidth(width: number, viewport: number): number {
    return Math.round(Math.max(MIN_SIDEBAR_WIDTH, Math.min(width, viewport - PAGE_ROOM)));
}

function stored(): number | null {
    try {
        const value = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));

        return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
        return null;
    }
}

function store(width: number | null): void {
    try {
        if (width === null) {
            window.localStorage.removeItem(SIDEBAR_WIDTH_KEY);
        } else {
            window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
        }
    } catch {
        // Private browsing: the width lasts until the page closes.
    }
}

/**
 * The width the user gave the editor panel by dragging its edge, kept in
 * the browser for next time; null for the default.
 */
export function useSidebarWidth() {
    const [width, setWidthState] = useState<number | null>(stored);

    function setWidth(next: number, keep = true) {
        const clamped = clampSidebarWidth(next, window.innerWidth);

        setWidthState(clamped);

        if (keep) {
            store(clamped);
        }
    }

    function reset() {
        setWidthState(null);
        store(null);
    }

    return { width, setWidth, keep: () => store(width), reset };
}
