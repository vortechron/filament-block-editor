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

/**
 * The document with an id on every block that has none, through columns
 * and children; ids already there stay. Words saved by code, like a
 * migration, have no ids, and the builder finds items by id (the
 * Structure tree, the item panel). The same document when nothing is
 * missing.
 */
export function withMissingBlockIds(document: RichDocument): RichDocument {
    let changed = false;
    const next = document.map((block) => {
        const children = Array.isArray(block.children)
            ? withMissingBlockIds(block.children as RichDocument)
            : block.children;
        const hasId = typeof block.id === 'string' && block.id !== '';

        if (hasId && children === block.children) {
            return block;
        }

        changed = true;

        return {
            ...block,
            id: hasId ? block.id : newBlockId(),
            ...(Array.isArray(children) ? { children } : {}),
        };
    });

    return changed ? next : document;
}

/** The page with an id on every block of its words (withMissingBlockIds()). */
export function withMissingPageBlockIds<T extends { sections: readonly Section[] }>(value: T): T {
    return {
        ...value,
        sections: value.sections.map((section) =>
            section.type === 'rich'
                ? {
                      ...section,
                      data: {
                          ...section.data,
                          document: withMissingBlockIds(section.data.document),
                      },
                  }
                : section,
        ),
    };
}
