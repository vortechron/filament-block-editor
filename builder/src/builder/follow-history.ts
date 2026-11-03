import { isSame } from '@/lib/page-history';
import type { PageValue, Section } from '@/types';
import type { Selection } from './types';

/** What the builder does after an undo or a redo, to follow the change. */
export type FollowPlan =
    /** A section came back: pick it and scroll the page to it. */
    | { kind: 'bring'; sectionId: string }
    /** The picked section is gone: pick nothing. */
    | { kind: 'clear' }
    /**
     * Keep the pick. `sectionOnly` when the picked item is gone, and
     * `words` when the picked section's words changed, so its open
     * editor must show them again.
     */
    | { kind: 'keep'; sectionOnly: boolean; words: boolean };

/** How the pick follows the page going from `before` to `after`. */
export function followChange(
    before: PageValue,
    after: PageValue,
    selection: Selection,
): FollowPlan {
    const had = new Set(before.sections.map((section) => section.id));
    const back = after.sections.find((section) => !had.has(section.id));

    if (back) {
        return { kind: 'bring', sectionId: back.id };
    }

    if (selection.sectionId === null) {
        return { kind: 'keep', sectionOnly: false, words: false };
    }

    const now = after.sections.find((section) => section.id === selection.sectionId);

    if (now === undefined) {
        return { kind: 'clear' };
    }

    const then = before.sections.find((section) => section.id === selection.sectionId);

    return {
        kind: 'keep',
        sectionOnly: selection.itemId !== null && !hasBlock(wordsOf(now), selection.itemId),
        words: !isSame(wordsOf(then), wordsOf(now)),
    };
}

function wordsOf(section: Section | undefined): readonly unknown[] {
    return section?.type === 'rich' ? section.data.document : [];
}

/** Is a block with this id in the words, columns and children too? */
function hasBlock(blocks: readonly unknown[], id: string): boolean {
    return blocks.some((block) => {
        if (typeof block !== 'object' || block === null) {
            return false;
        }

        const { id: blockId, children } = block as { id?: unknown; children?: unknown };

        return blockId === id || (Array.isArray(children) && hasBlock(children, id));
    });
}
