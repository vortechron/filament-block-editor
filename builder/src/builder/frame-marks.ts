import { isPartKey, PART_KEYS } from '@/lib/site-parts';
import type { PartKey } from '@/types';
import { frameItem, PAGE_SECTION, pageSections } from './frame-dom';

/** What a click on the page picked. */
export type FramePick =
    | { kind: 'section'; sectionId: string; path: string | null }
    | { kind: 'part'; part: PartKey }
    | { kind: 'nothing' };

/** What the builder marks on the page. */
export type FrameMarks = {
    /** The label on each section, like "3. Hero", by section id. */
    sectionLabels: ReadonlyMap<string, string>;
    pickedSectionId: string | null;
    /** The picked item's place in its section, as the page marks it. */
    pickedItemPath: string | null;
    /** The label on the header and footer, by part. */
    partLabels: Readonly<Record<PartKey, string>>;
    pickedPart: PartKey | null;
    /** The badge on a hidden section, translated. */
    hiddenLabel: string;
    scale: number;
};

/**
 * What can be picked: the page's own sections, and the header and footer.
 * Other parts, like the home page's content in the header builder, and
 * the sections inside any part, are not.
 */
const TARGETS = `:is(${[
    PAGE_SECTION,
    ...PART_KEYS.map((part) => `[data-part="${part}"]`),
].join(', ')})`;

/**
 * The builder's marks inside the page: a dashed frame on hover, a blue
 * frame and a label on the picked section or part (the header and
 * footer the host wraps in `data-part`), a frame on the picked item, and
 * hidden sections dimmed with a badge.
 */
export const FRAME_STYLES = `
[data-preview-banner] { display: none !important; }
${TARGETS} { position: relative; cursor: pointer; }
${TARGETS}:has(*)::before {
    content: ''; position: absolute; inset: 0; z-index: 59;
    border: calc(1px * var(--builder-ui, 1)) dashed transparent;
    pointer-events: none; transition: border-color 0.15s;
}
${TARGETS}:hover::before { border-color: rgb(37 99 235 / 0.75); }
${TARGETS}[data-builder-picked]::before { border: calc(2px * var(--builder-ui, 1)) solid #2563eb; }
${TARGETS}::after {
    content: attr(data-builder-label);
    position: absolute; top: 0; left: 0; z-index: 60;
    padding: calc(0.3rem * var(--builder-ui, 1)) calc(0.65rem * var(--builder-ui, 1));
    border-bottom-right-radius: calc(0.5rem * var(--builder-ui, 1));
    background: #2563eb; color: #fff;
    font: 600 calc(12px * var(--builder-ui, 1))/1.3 system-ui, -apple-system, sans-serif;
    letter-spacing: 0; text-transform: none;
    pointer-events: none; opacity: 0; transition: opacity 0.15s;
}
${TARGETS}:hover::after, ${TARGETS}[data-builder-picked]::after { opacity: 1; }
[data-block-id] [data-part]::after { z-index: 61; }
${PAGE_SECTION}[data-builder-picked] [data-item]:hover { outline: 1px dashed rgb(37 99 235 / 0.6); outline-offset: 3px; }
[data-builder-picked-item] { outline: calc(2px * var(--builder-ui, 1)) solid #2563eb !important; outline-offset: 3px; }
${PAGE_SECTION}[data-hidden] > :not([data-builder-hidden-badge]) { opacity: 0.45; filter: grayscale(0.5); }
[data-builder-hidden-badge] {
    position: absolute; top: calc(0.5rem * var(--builder-ui, 1)); right: calc(0.5rem * var(--builder-ui, 1)); z-index: 60;
    padding: calc(0.25rem * var(--builder-ui, 1)) calc(0.6rem * var(--builder-ui, 1));
    border-radius: 999px; background: #0f172a; color: #fff;
    font: 600 calc(12px * var(--builder-ui, 1))/1.3 system-ui, -apple-system, sans-serif;
    letter-spacing: 0; text-transform: none; pointer-events: none;
}
`;

/**
 * What a click on `target` picks. Inside a `data-part` it is the header
 * or footer, even on one of its own sections, and nothing in any other
 * part (like the home page's content around the header being built).
 * Elsewhere it is the section of the page under it.
 */
export function pickAt(target: Element): FramePick {
    const part = target.closest('[data-part]');

    if (part) {
        const key = part.getAttribute('data-part');

        return isPartKey(key) ? { kind: 'part', part: key } : { kind: 'nothing' };
    }

    const section = target.closest('[data-block-id]');

    return section
        ? {
              kind: 'section',
              sectionId: section.getAttribute('data-block-id') ?? '',
              path: target.closest('[data-item]')?.getAttribute('data-item') ?? null,
          }
        : { kind: 'nothing' };
}

/** Puts the builder's marks on the page, and takes old ones off. */
export function applyMarks(page: Document, marks: FrameMarks): void {
    // The labels and frames keep their size when the page is shrunk.
    page.documentElement.style.setProperty('--builder-ui', String(1 / marks.scale));

    pageSections(page).forEach((section) => {
        const id = section.dataset.blockId ?? '';

        section.setAttribute('data-builder-label', marks.sectionLabels.get(id) ?? '');
        section.toggleAttribute('data-builder-picked', id === marks.pickedSectionId);
        markHidden(page, section, marks.hiddenLabel);
    });

    page.querySelectorAll<HTMLElement>('[data-part]').forEach((element) => {
        const part = element.dataset.part;

        if (isPartKey(part)) {
            element.setAttribute('data-builder-label', marks.partLabels[part]);
            element.toggleAttribute('data-builder-picked', part === marks.pickedPart);
        }
    });

    page.querySelectorAll('[data-builder-picked-item]').forEach((item) =>
        item.removeAttribute('data-builder-picked-item'),
    );

    if (marks.pickedSectionId !== null && marks.pickedItemPath !== null) {
        const section = page.querySelector<HTMLElement>(
            `${PAGE_SECTION}[data-block-id="${CSS.escape(marks.pickedSectionId)}"]`,
        );

        frameItem(section, marks.pickedItemPath)?.setAttribute('data-builder-picked-item', '');
    }
}

/**
 * A hidden section (the server marks it `data-hidden` for the builder)
 * gets a badge, so it is plain why visitors do not see it.
 */
function markHidden(page: Document, section: HTMLElement, label: string): void {
    const badge = section.querySelector(':scope > [data-builder-hidden-badge]');

    if (!section.hasAttribute('data-hidden')) {
        badge?.remove();

        return;
    }

    if (badge) {
        badge.textContent = label;

        return;
    }

    const added = page.createElement('span');

    added.setAttribute('data-builder-hidden-badge', '');
    added.setAttribute('aria-hidden', 'true');
    added.textContent = label;
    section.prepend(added);
}
