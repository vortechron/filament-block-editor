import type { Block, BlockNoteEditor } from '@blocknote/core';
import type { MouseEvent } from 'react';

/**
 * The parts of the editor that are only empty space: the section's padding,
 * the side padding of the text column and the list of blocks itself.
 */
const EMPTY_SPACE =
    '.bnk-blocknote, .bn-container, .bn-editor, .bn-editor > .bn-block-group';

/**
 * Tapping the empty space under the last block puts the cursor on a new line
 * there, ready for the next block.
 *
 * BlockNote does this only for a strip under the last block that is 30px
 * high and as wide as the text, and its down arrow stops at the last line.
 * A Cards section with little padding left a tablet almost nowhere to tap.
 */
export function addLineBelowOnTap(
    event: MouseEvent<HTMLElement>,
    editor: BlockNoteEditor | null,
): void {
    const target = event.target;

    if (
        editor === null ||
        event.button !== 0 ||
        !(target instanceof Element) ||
        !target.matches(EMPTY_SPACE)
    ) {
        return;
    }

    const lastBlock = editor.document.at(-1);
    const lastElement = lastBlock
        ? event.currentTarget.querySelector(
              `.bn-block-outer[data-id="${CSS.escape(lastBlock.id)}"]`,
          )
        : null;

    if (
        !lastBlock ||
        !lastElement ||
        event.clientY <= lastElement.getBoundingClientRect().bottom
    ) {
        return;
    }

    // The editor takes the tap, so ProseMirror and the browser do not move
    // the cursor somewhere else.
    event.preventDefault();
    event.stopPropagation();

    const line = isEmptyParagraph(lastBlock)
        ? lastBlock
        : editor.insertBlocks([{ type: 'paragraph' }], lastBlock, 'after')[0];

    editor.setTextCursorPosition(line, 'end');
    editor.focus();
}

function isEmptyParagraph(block: Block): boolean {
    return (
        block.type === 'paragraph' &&
        Array.isArray(block.content) &&
        block.content.length === 0
    );
}
