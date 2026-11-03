import type { PartKey, SectionLayout } from '@/types';

/**
 * What is picked on the canvas. Nothing picked is the page itself. An
 * item is one block inside a section's editor, like a heading or a
 * button.
 */
export type Selection = {
    sectionId: string | null;
    itemId: string | null;
};

export const NOTHING_SELECTED: Selection = { sectionId: null, itemId: null };

/** The two panels the sidebar opens on when nothing is being edited. */
export type HomePanelName = 'add' | 'layers';

/** The panels a shop info row opens from, so Back returns to them. */
export type SiteInfoReturn = { name: 'item' } | { name: 'part'; part: PartKey };

export type SidebarPanel =
    | { name: HomePanelName }
    | { name: 'section' }
    | { name: 'item' }
    | { name: 'design' }
    /**
     * The shop info form: the whole form from the top bar, or only some
     * `groups` from a row of an item or a part, which `back` returns to.
     */
    | { name: 'siteInfo'; groups?: readonly string[]; back?: SiteInfoReturn }
    /** The header or footer, picked on the canvas. */
    | { name: 'part'; part: PartKey };

/**
 * The panel the sidebar is about: the item or part a shop info row was
 * opened from, while that shop info shows, else the panel itself.
 */
export function panelUnder(panel: SidebarPanel): SidebarPanel {
    return panel.name === 'siteInfo' && panel.back !== undefined ? panel.back : panel;
}

/**
 * The picked section's tabs: its words and items, its simple look
 * (layout, background, presets), its open style, and advanced settings.
 */
export type SectionTab = 'content' | 'look' | 'style' | 'advanced';

/** How wide the canvas is: a laptop screen, a tablet or a phone. */
export type Device = 'desktop' | 'tablet' | 'phone';

/**
 * Something that can be added inside a section. Each one is a block the
 * public page already draws (Rendering\BlockNoteRenderer). `own:<kind>`
 * is one of the host's own blocks.
 */
export type ItemKey =
    | `own:${string}`
    | 'heading'
    | 'subheading'
    | 'paragraph'
    | 'bulletList'
    | 'numberedList'
    | 'quote'
    | 'toggle'
    | 'image'
    | 'gallery'
    | 'video'
    | 'twoColumns'
    | 'threeColumns'
    | 'card'
    | 'spacer'
    | 'divider'
    | 'button'
    | 'form'
    | 'layoutItem';

/** Where a new item goes in a section: next to a block, or at the end. */
export type ItemPlace =
    | { blockId: string; placement: 'before' | 'after' }
    | { blockId: null };

/**
 * Next to an item found by its place on the page, for a drop on the page.
 * The section's editor turns it into a block id once it is open.
 */
export type PagePlace = { path: string; placement: 'before' | 'after' };

/** One block as the item panel needs it. */
export type ItemSnapshot = {
    id: string;
    type: string;
    props: Record<string, unknown>;
    /** The block's words, for the sidebar title. */
    text: string;
    /** The block's words as BlockNote holds them, with any shop info chips. */
    content?: unknown;
    /** The blocks inside it, like a column's items. */
    children?: unknown;
    isFirst: boolean;
    isLast: boolean;
};

/**
 * One section's open editor, as the rest of the builder talks to it. Made
 * in section-editor-handle.ts, next to the lazily loaded editor.
 */
export type SectionEditorHandle = {
    /** Adds an item and returns its block id, or null when it failed. */
    insertItem: (
        key: ItemKey,
        place: ItemPlace,
        layout: SectionLayout,
    ) => string | null;
    getItem: (blockId: string) => ItemSnapshot | null;
    updateItem: (blockId: string, props: Record<string, unknown>) => void;
    changeItemType: (
        blockId: string,
        type: string,
        props?: Record<string, unknown>,
    ) => void;
    moveItem: (blockId: string, offset: -1 | 1) => void;
    duplicateItem: (blockId: string) => string | null;
    removeItem: (blockId: string) => void;
    /**
     * The block at a place the page marked with `data-item`, like "1.0",
     * or null when the editor has no block there.
     */
    itemAtPath: (path: string) => string | null;
    /** A block's place in the section, the way the page marks it. */
    pathOf: (blockId: string) => string | null;
    /** Puts the cursor in a block and scrolls to it. */
    focusItem: (blockId: string) => void;
    /** The block holding the cursor while the editor has focus. */
    cursorItemId: () => string | null;
    /** Runs `listener` after every change and cursor move. */
    subscribe: (listener: () => void) => () => void;
};
