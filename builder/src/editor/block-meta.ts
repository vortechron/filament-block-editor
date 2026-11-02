import { newSectionId } from '@/lib/page-value';
import type { RichDocument, Section } from '@/types';

/**
 * The name a section shows in the list: its first heading, or its first
 * line when it has no heading.
 */
export function blockTitle(block: Section): string {
    const heading = block.data.document.find((item) => item.type === 'heading');

    return (
        (heading ? inlineText(heading.content) : '').trim() ||
        documentText(block.data.document).split('\n')[0] ||
        ''
    );
}

export function duplicateBlock(block: Section): Section {
    return { ...structuredClone(block), id: newSectionId() };
}

/**
 * The same section, hidden from the page or shown again. A shown section
 * has no `hidden` key, the same as the server stores it.
 */
export function withHidden(block: Section, hidden: boolean): Section {
    if (hidden) {
        return { ...block, hidden: true };
    }

    const { hidden: _wasHidden, ...shown } = block;

    return shown;
}

/**
 * The words in a document, one line per block, in reading order, walking
 * columns, cards and indented blocks.
 */
export function documentText(document: RichDocument): string {
    return document
        .flatMap((block) => [
            inlineText(block.content),
            Array.isArray(block.children)
                ? documentText(block.children as RichDocument)
                : '',
        ])
        .filter((line) => line.trim() !== '')
        .join('\n');
}

function inlineText(content: unknown): string {
    if (typeof content === 'string') {
        return content;
    }

    if (!Array.isArray(content)) {
        return '';
    }

    return content
        .map((item: unknown) => {
            if (typeof item !== 'object' || item === null) {
                return '';
            }

            const { text, content: inner } = item as {
                text?: unknown;
                content?: unknown;
            };

            return (typeof text === 'string' ? text : '') + inlineText(inner);
        })
        .join('');
}
