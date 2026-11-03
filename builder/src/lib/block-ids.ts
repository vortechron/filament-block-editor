import type { RichDocument, RichSection, Section } from '@/types';

/**
 * Block ids must be unique on a page: a block's style (`.fbe-b-{id}`),
 * `hide_on`, a form's `form-{id}` anchor and `_form` key, and the server's
 * guard all find a block by its id. So every copy of a section (duplicate,
 * a template added again, a detached synced section) gives each block in
 * it a new id. The server does the same for any id it sees twice
 * (Content\PageContent::normalize()).
 */

/** A new block id. Math.random on purpose: crypto.randomUUID needs https. */
export function newBlockId(): string {
    const part = () => Math.random().toString(36).slice(2, 8).padEnd(6, '0');

    return `${part()}${part()}`;
}

/** The document with every block, through columns and children, under a new id. */
export function withNewBlockIds(document: RichDocument): RichDocument {
    return document.map((block) => ({
        ...block,
        id: newBlockId(),
        ...(Array.isArray(block.children)
            ? { children: withNewBlockIds(block.children as RichDocument) }
            : {}),
    }));
}

/** The section with every block in its words under a new id. */
export function withNewSectionBlockIds<T extends Section>(section: T): T {
    if (section.type !== 'rich') {
        return section;
    }

    const rich = section as RichSection;

    return {
        ...rich,
        data: { ...rich.data, document: withNewBlockIds(rich.data.document) },
    } as T;
}
