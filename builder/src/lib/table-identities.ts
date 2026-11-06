import type { PageValue, RichDocument } from '@/types';
import { inlineWords, type InlineWords } from './rich-text';
import { newBlockId } from './block-ids';
import type { BlockCopyMap } from './translation-copies';

export type TableCellEdit = {
    tableId: string;
    cellId: string;
    content: InlineWords;
};
export type IdentifiedTableEditor = {
    content: (tableId: string) => unknown;
    setCell: (edit: TableCellEdit) => void;
    copied: (mapping: BlockCopyMap) => void;
};
const object = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);
const invalidCells = () =>
    new Error(
        'This table has missing or duplicate cell IDs. Ask the site owner to repair its identities before editing its translations.',
    );

/** PHP encodes an empty style map as []; the inline payload itself still requires an object. */
function cellWords(raw: unknown): InlineWords {
    return inlineWords(
        Array.isArray(raw)
            ? raw.map((item: unknown) => {
                  if (!object(item)) return item;
                  return {
                      ...item,
                      ...(item.type === 'text' &&
                      Array.isArray(item.styles) &&
                      item.styles.length === 0
                          ? { styles: {} }
                          : {}),
                      ...(item.type === 'link'
                          ? { content: cellWords(item.content) }
                          : {}),
                  };
              })
            : raw,
    );
}

/** A named cell can be edited only after every identity in its table is validated. */
export function identifiedTableCells(content: unknown) {
    if (
        !object(content) ||
        content.type !== 'tableContent' ||
        !Array.isArray(content.rows)
    )
        throw invalidCells();
    const seen = new Set<string>();
    return content.rows.flatMap((row: unknown, rowIndex) => {
        if (!object(row) || !Array.isArray(row.cells)) throw invalidCells();
        return row.cells.map((cell: unknown, columnIndex) => {
            if (
                !object(cell) ||
                cell.type !== 'tableCell' ||
                typeof cell._id !== 'string' ||
                !/^[A-Za-z0-9_-]{1,40}$/.test(cell._id) ||
                seen.has(cell._id)
            )
                throw invalidCells();
            seen.add(cell._id);
            return {
                id: cell._id,
                row: rowIndex + 1,
                column: columnIndex + 1,
                content: cellWords(cell.content),
            };
        });
    });
}

/** The caller names the identity; row/column positions never decide which translation moves. */
export function editTableCell(
    document: RichDocument,
    edit: TableCellEdit,
): RichDocument {
    const table = tables(document).get(edit.tableId);
    if (
        !table ||
        !identifiedTableCells(table.content).some(
            (cell) => cell.id === edit.cellId,
        )
    )
        throw invalidCells();
    const visit = (blocks: RichDocument): RichDocument =>
        blocks.map((block) => {
            if (
                block.id === edit.tableId &&
                object(block.content) &&
                Array.isArray(block.content.rows)
            ) {
                return {
                    ...block,
                    content: {
                        ...block.content,
                        rows: block.content.rows.map((row: unknown) => {
                            if (!object(row) || !Array.isArray(row.cells))
                                throw invalidCells();
                            return {
                                ...row,
                                cells: row.cells.map((cell: unknown) =>
                                    object(cell) && cell._id === edit.cellId
                                        ? {
                                              ...cell,
                                              content: inlineWords(
                                                  edit.content,
                                              ),
                                          }
                                        : cell,
                                ),
                            };
                        }),
                    },
                };
            }
            return {
                ...block,
                ...(Array.isArray(block.children)
                    ? { children: visit(block.children as RichDocument) }
                    : {}),
            };
        });
    return visit(document);
}

export function tableContent(document: RichDocument, id: string): unknown {
    return tables(document).get(id)?.content;
}

export function tableIds(document: RichDocument): string[] {
    return [...tables(document).keys()];
}

/** Record deleted cell words with their table, so Undo restores both together. */
export function withoutDeletedTableTranslations(
    before: PageValue,
    next: PageValue,
): PageValue {
    if (!next.translations) return next;
    const deleted = new Set(
        before.sections.flatMap((section) =>
            section.type === 'rich' ? tableIds(section.data.document) : [],
        ),
    );
    for (const section of next.sections) {
        if (section.type === 'rich')
            for (const id of tableIds(section.data.document))
                deleted.delete(id);
    }
    if (deleted.size === 0) return next;
    let changed = false;
    const translations = Object.fromEntries(
        Object.entries(next.translations).map(([locale, words]) => [
            locale,
            Object.fromEntries(
                Object.entries(words).filter(([key]) => {
                    const id = /^block:([^/]+)\/rich-cell:/.exec(key)?.[1];
                    if (id === undefined || !deleted.has(id)) return true;
                    changed = true;
                    return false;
                }),
            ),
        ]),
    );
    return changed ? { ...next, translations } : next;
}

/** The duplicate action supplies source and destination block IDs, including nested tables. */
export function copyTableIdentities(
    document: RichDocument,
    mapping: BlockCopyMap,
): RichDocument {
    const sources = tables(document);
    const copies = new Map(
        Object.entries(mapping).flatMap(([source, target]) => {
            const table = sources.get(source);
            return table ? [[target, table.content] as const] : [];
        }),
    );
    if (copies.size === 0) return document;
    const visit = (blocks: RichDocument): RichDocument =>
        blocks.map((block) => ({
            ...block,
            ...(typeof block.id === 'string' && copies.has(block.id)
                ? { content: structuredClone(copies.get(block.id)) }
                : {}),
            ...(Array.isArray(block.children)
                ? { children: visit(block.children as RichDocument) }
                : {}),
        }));
    return visit(document);
}

/** A newly inserted table has no prior identities or translations to align. */
function identifyNewTable(content: unknown): object {
    if (
        !object(content) ||
        content.type !== 'tableContent' ||
        !Array.isArray(content.rows)
    )
        throw invalidCells();
    return {
        ...content,
        rows: content.rows.map((row: unknown) => {
            if (!object(row) || !Array.isArray(row.cells)) throw invalidCells();
            return {
                ...row,
                cells: row.cells.map((raw: unknown) => {
                    const cell = object(raw)
                        ? raw
                        : {
                              type: 'tableCell',
                              props: {},
                              content: inlineWords(raw),
                          };
                    return { ...cell, _id: newBlockId() };
                }),
            };
        }),
    };
}

const tables = (document: RichDocument): Map<string, RichDocument[number]> => {
    const result = new Map<string, RichDocument[number]>();
    const visit = (blocks: RichDocument) =>
        blocks.forEach((block) => {
            if (block.type === 'table' && typeof block.id === 'string')
                result.set(block.id, block);
            if (Array.isArray(block.children))
                visit(block.children as RichDocument);
        });
    visit(document);
    return result;
};

/** BlockNote drops private cell ids. Preserve unchanged tables; never infer moved cell identity. */
export function retainTableIdentities(
    canonical: RichDocument,
    previousEditor: RichDocument,
    incoming: RichDocument,
): RichDocument {
    const original = tables(canonical),
        before = tables(previousEditor),
        next = tables(incoming);
    for (const [id] of original) {
        // Removing a whole table deletes shared layout, not a surviving cell's identity.
        if (!next.has(id)) continue;
        if (
            JSON.stringify(before.get(id)?.content) !==
            JSON.stringify(next.get(id)?.content)
        ) {
            throw new Error(
                'This table edit was not applied because its cell identities cannot be tracked safely. Rebuild the table translations before changing its structure.',
            );
        }
    }
    for (const [id, block] of next) {
        if (original.has(id)) continue;
        if (before.has(id)) throw invalidCells();
        original.set(id, {
            ...block,
            content: identifyNewTable(block.content),
        });
    }
    const visit = (blocks: RichDocument): RichDocument =>
        blocks.map((block) => {
            const source =
                typeof block.id === 'string'
                    ? original.get(block.id)
                    : undefined;
            return {
                ...block,
                ...(source ? { content: structuredClone(source.content) } : {}),
                ...(Array.isArray(block.children)
                    ? { children: visit(block.children as RichDocument) }
                    : {}),
            };
        });
    return visit(incoming);
}
