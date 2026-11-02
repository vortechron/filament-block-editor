/**
 * The plain logic behind the canvas, which shows the real page drawn by
 * the server (page-frame.tsx): what to redraw after a change, and how a
 * click on the page finds the item in the section's editor.
 */

/** One drawing of the page from the server, split for comparing. */
export type PageDrawing = {
    /** The page with the inside of every section left out. */
    frame: string;
    /** Each section's HTML by section id, in page order. */
    sections: ReadonlyMap<string, string>;
};

export type FrameUpdate =
    | { kind: 'reload' }
    | { kind: 'swap'; sectionIds: string[] }
    | { kind: 'none' };

/**
 * Typing changes one section, so only that section is swapped on the
 * page and the rest keeps its scroll place, photos and slideshows. A
 * change around the sections, like the order of the sections or the
 * page's own header, draws the whole page again.
 */
export function planUpdate(
    previous: PageDrawing | null,
    next: PageDrawing,
): FrameUpdate {
    if (previous === null || previous.frame !== next.frame) {
        return { kind: 'reload' };
    }

    const before = [...previous.sections.keys()];
    const after = [...next.sections.keys()];

    if (
        before.length !== after.length ||
        before.some((id, index) => after[index] !== id)
    ) {
        return { kind: 'reload' };
    }

    const sectionIds = after.filter(
        (id) =>
            (previous.sections.get(id) ?? '') !== (next.sections.get(id) ?? ''),
    );

    return sectionIds.length === 0
        ? { kind: 'none' }
        : { kind: 'swap', sectionIds };
}

/** A block as the editor holds it: only what finding it needs. */
export type TreeBlock = {
    id: string;
    type: string;
    children?: TreeBlock[];
};

/**
 * The block at a place the preview marked with `data-item`, like "1.0.2":
 * the third block in the first block inside the second block. See
 * BlockNoteRenderer::ITEM_PATH.
 */
export function blockAtPath<T extends TreeBlock>(
    blocks: readonly T[],
    path: string,
): T | null {
    if (!/^\d+(\.\d+)*$/.test(path)) {
        return null;
    }

    let level: readonly TreeBlock[] = blocks;
    let found: TreeBlock | null = null;

    for (const step of path.split('.')) {
        found = level[Number(step)] ?? null;

        if (found === null) {
            return null;
        }

        level = found.children ?? [];
    }

    return found as T | null;
}

/** The place of a block in the document, the way the preview marks it. */
export function pathOfBlock(
    blocks: readonly TreeBlock[],
    blockId: string,
): string | null {
    for (const [index, block] of blocks.entries()) {
        if (block.id === blockId) {
            return String(index);
        }

        const inside = pathOfBlock(block.children ?? [], blockId);

        if (inside !== null) {
            return `${index}.${inside}`;
        }
    }

    return null;
}

const TEXT_ITEMS = new Set([
    'paragraph',
    'heading',
    'quote',
    'bulletListItem',
    'numberedListItem',
    'checkListItem',
    'toggleListItem',
]);

/**
 * Whether a click on this item opens its words in the section's editor.
 * Photos, buttons, own blocks and the like open their settings instead.
 */
export function isTextItem(type: string): boolean {
    return TEXT_ITEMS.has(type);
}

/** An item's box on the page. */
export type Row = {
    key: string;
    left: number;
    right: number;
    top: number;
    bottom: number;
};

/**
 * Where a dragged item lands: next to the item nearest the pointer. In
 * the gap beside an item, like between two cards in a row, it goes on
 * that side; otherwise above or below it.
 */
export function nearestPlace(
    rows: readonly Row[],
    at: { x: number; y: number },
): { key: string; placement: 'before' | 'after' } | null {
    if (rows.length === 0) {
        return null;
    }

    const outside = (row: Row) => ({
        x: gapTo(row.left, row.right, at.x),
        y: gapTo(row.top, row.bottom, at.y),
    });
    const distance = (row: Row) => Math.hypot(outside(row).x, outside(row).y);
    const nearest = rows.reduce((best, row) =>
        distance(row) < distance(best) ? row : best,
    );
    const gap = outside(nearest);
    const isBefore =
        gap.x > 0 && gap.y === 0
            ? at.x < nearest.left
            : at.y < (nearest.top + nearest.bottom) / 2;

    return { key: nearest.key, placement: isBefore ? 'before' : 'after' };
}

/** How far a value is outside a range, or 0 inside it. */
function gapTo(low: number, high: number, value: number): number {
    if (value < low) {
        return low - value;
    }

    return value > high ? value - high : 0;
}
