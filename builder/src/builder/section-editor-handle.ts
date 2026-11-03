import {
    type Block,
    type BlockNoteEditor,
    getDefaultSlashMenuItems,
    insertOrUpdateBlockForSlashMenu,
    type PartialBlock,
} from '@blocknote/core';
import {
    cardSlashMenuItem,
    columnSlashMenuItems,
    spacerSlashMenuItem,
} from '@vortechron/blocknote-kit';
import type { SectionLayout } from '@/types';
import { layoutSlashMenuItems } from '../editor/layout-slash-items';
import { blockAtPath, pathOfBlock } from './page-frame-updates';
import type {
    ItemKey,
    ItemPlace,
    ItemSnapshot,
    SectionEditorHandle,
} from './types';

/**
 * The editor holds the page's own blocks too, so its schema is wider than
 * BlockNote's default one. The builder only reads and writes plain props.
 */
type AnyEditor = BlockNoteEditor<any, any, any>;
type AnyBlock = Block<any, any, any>;

/** The layout entries only need their titles translated for the "/" menu. */
const untranslated = (text: string) => text;

/**
 * Wraps one section's BlockNote editor so the sidebar, the page on the
 * canvas and the drag and drop can add, change and move its items. Every
 * change goes through BlockNote, so the section's onChange saves it like
 * typing does.
 */
/**
 * What a new item starts with: the button's words, and the starter form's
 * JSON, in the builder's language.
 */
export type NewItemLabels = { button: string; form: string };

export function createSectionEditorHandle(
    editor: AnyEditor,
    labels: NewItemLabels = { button: 'Read more', form: '' },
): SectionEditorHandle {
    return {
        insertItem: (key, place, layout) =>
            insertItem(editor, key, place, layout, labels),
        getItem: (blockId) => snapshot(editor, blockId),
        updateItem: (blockId, props) => {
            if (editor.getBlock(blockId)) {
                editor.updateBlock(blockId, { props });
            }
        },
        changeItemType: (blockId, type, props = {}) => {
            if (editor.getBlock(blockId)) {
                editor.updateBlock(blockId, { type, props });
            }
        },
        moveItem: (blockId, offset) => {
            if (!editor.getBlock(blockId)) {
                return;
            }

            if (offset < 0) {
                editor.moveBlocksUp(blockId);
            } else {
                editor.moveBlocksDown(blockId);
            }
        },
        duplicateItem: (blockId) => {
            const block = editor.getBlock(blockId);

            if (!block) {
                return null;
            }

            const [copy] = editor.insertBlocks(
                [withoutIds(block)],
                block,
                'after',
            );

            return copy?.id ?? null;
        },
        removeItem: (blockId) => {
            if (editor.getBlock(blockId)) {
                editor.removeBlocks([blockId]);
            }
        },
        itemAtPath: (path) => blockAtPath(editor.document, path)?.id ?? null,
        pathOf: (blockId) => pathOfBlock(editor.document, blockId),
        focusItem: (blockId) => focusItem(editor, blockId),
        cursorItemId: () =>
            editor.isFocused() ? editor.getTextCursorPosition().block.id : null,
        subscribe: (listener) => {
            const stopChange = editor.onChange(listener);
            const stopSelection = editor.onSelectionChange(listener);

            return () => {
                stopChange();
                stopSelection();
            };
        },
    };
}

/**
 * Puts an empty line where the item goes, then lets the same code the "/"
 * menu runs turn that line into the item. So a photo opens the upload
 * panel and a new point copies the list's ✅, exactly as typing "/" does.
 */
function insertItem(
    editor: AnyEditor,
    key: ItemKey,
    place: ItemPlace,
    layout: SectionLayout,
    labels: NewItemLabels,
): string | null {
    const line = emptyLineAt(editor, place);

    if (line === null) {
        return null;
    }

    editor.focus();
    editor.setTextCursorPosition(line, 'end');

    const inserted = runInsert(editor, key, layout, labels);
    const id =
        inserted ??
        (editor.getBlock(line.id)
            ? line.id
            : editor.getTextCursorPosition().block.id);

    scrollToBlock(editor, id);

    return id;
}

function runInsert(
    editor: AnyEditor,
    key: ItemKey,
    layout: SectionLayout,
    labels: NewItemLabels,
): string | null {
    const slash = (type: string, props?: Record<string, unknown>) =>
        insertOrUpdateBlockForSlashMenu(editor, { type, props } as never).id;
    const fromMenu = (menuKey: string) => {
        getDefaultSlashMenuItems(editor)
            .find((item) => item.key === menuKey)
            ?.onItemClick();

        return null;
    };

    if (key.startsWith('own:')) {
        return slash('ownBlock', { kind: key.slice(4), values: '{}' });
    }

    switch (key) {
        case 'heading':
            return slash('heading', { level: 2 });
        case 'subheading':
            return slash('heading', { level: 3 });
        case 'paragraph':
            return slash('paragraph');
        case 'bulletList':
            return slash('bulletListItem');
        case 'numberedList':
            return slash('numberedListItem');
        case 'quote':
            return slash('quote');
        case 'toggle':
            return slash('toggleListItem');
        case 'image':
            return fromMenu('image');
        case 'video':
            return fromMenu('video');
        case 'divider':
            return fromMenu('divider');
        case 'gallery':
            return slash('gallery');
        case 'button':
            return slash('button', { text: labels.button, url: '', variant: 'solid' });
        case 'form':
            return slash('form', { form: labels.form });
        case 'twoColumns':
        case 'threeColumns':
            columnSlashMenuItems(editor)[
                key === 'twoColumns' ? 0 : 1
            ]?.onItemClick();

            return null;
        case 'card':
            cardSlashMenuItem(editor).onItemClick();

            return null;
        case 'spacer':
            spacerSlashMenuItem(editor).onItemClick();

            return null;
        case 'layoutItem':
            layoutSlashMenuItems(
                editor,
                layout,
                untranslated,
            )[0]?.onItemClick();

            return null;
    }

    return null;
}

/**
 * An empty paragraph at the place asked for. An empty paragraph already
 * there is used as it is, so adding twice does not leave blank lines.
 */
function emptyLineAt(editor: AnyEditor, place: ItemPlace): AnyBlock | null {
    const reference =
        place.blockId === null
            ? editor.document.at(-1)
            : (editor.getBlock(place.blockId) ?? editor.document.at(-1));

    if (!reference) {
        return null;
    }

    if (isEmptyParagraph(reference)) {
        return reference;
    }

    const placement =
        place.blockId === null || !editor.getBlock(place.blockId)
            ? 'after'
            : place.placement;

    return (
        editor.insertBlocks([{ type: 'paragraph' }], reference, placement)[0] ??
        null
    );
}

function snapshot(editor: AnyEditor, blockId: string): ItemSnapshot | null {
    const block = editor.getBlock(blockId);

    if (!block) {
        return null;
    }

    return {
        id: block.id,
        type: block.type,
        props: { ...(block.props as Record<string, unknown>) },
        text: inlineText(block.content),
        isFirst: editor.getPrevBlock(block) === undefined,
        isLast: editor.getNextBlock(block) === undefined,
    };
}

function focusItem(editor: AnyEditor, blockId: string): void {
    const block = editor.getBlock(blockId);

    if (!block) {
        return;
    }

    if (Array.isArray(block.content)) {
        editor.focus();
        editor.setTextCursorPosition(block, 'end');
    }

    scrollToBlock(editor, blockId);
}

function scrollToBlock(editor: AnyEditor, blockId: string): void {
    const element = editor.domElement?.querySelector(
        `.bn-block-outer[data-id="${CSS.escape(blockId)}"]`,
    );

    element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/** A copy of a block that BlockNote gives new ids, children included. */
function withoutIds(block: AnyBlock): PartialBlock<any, any, any> {
    return {
        type: block.type,
        props: block.props,
        content: block.content,
        children: block.children.map(withoutIds),
    } as PartialBlock<any, any, any>;
}

function isEmptyParagraph(block: AnyBlock): boolean {
    return (
        block.type === 'paragraph' &&
        Array.isArray(block.content) &&
        block.content.length === 0 &&
        block.children.length === 0
    );
}

function inlineText(content: unknown): string {
    if (!Array.isArray(content)) {
        return '';
    }

    return content
        .map((item: unknown) =>
            typeof item === 'object' &&
            item !== null &&
            'text' in item &&
            typeof item.text === 'string'
                ? item.text
                : '',
        )
        .join('');
}
