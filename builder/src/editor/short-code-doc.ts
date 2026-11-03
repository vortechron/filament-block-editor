import { type Fragment, type Node, Schema } from '@tiptap/pm/model';
import { joinShortCodes, parseShortCodes, type ShortCodePart } from '@/lib/short-codes';

/**
 * The document of a text field with shop values (short-code-field.tsx):
 * one line of text, `shopValue` pieces for `{key}` and line breaks for new
 * lines. The field stores it back as the plain words, so the page value
 * never holds anything but text.
 */
export const shortCodeSchema = new Schema({
    nodes: {
        doc: { content: 'line' },
        line: {
            content: 'inline*',
            parseDOM: [{ tag: 'p' }, { tag: 'div' }],
            toDOM: () => ['p', 0],
        },
        text: { group: 'inline' },
        shopValue: {
            inline: true,
            group: 'inline',
            atom: true,
            attrs: { key: { default: '' } },
            parseDOM: [
                {
                    tag: 'span[data-short-code]',
                    getAttrs: (dom) => ({ key: (dom as HTMLElement).dataset.shortCode ?? '' }),
                },
            ],
            toDOM: (node) => ['span', { 'data-short-code': node.attrs.key }, `{${node.attrs.key}}`],
        },
        hard_break: {
            inline: true,
            group: 'inline',
            selectable: false,
            parseDOM: [{ tag: 'br' }],
            toDOM: () => ['br'],
        },
    },
});

/** The pieces of some words, as nodes of the box's line. */
export function nodesFromText(text: string): Node[] {
    return parseShortCodes(text).flatMap((part) =>
        part.type === 'value'
            ? [shortCodeSchema.nodes.shopValue.create({ key: part.key })]
            : part.text.split('\n').flatMap((line, index) => [
                  ...(index > 0 ? [shortCodeSchema.nodes.hard_break.create()] : []),
                  ...(line === '' ? [] : [shortCodeSchema.text(line)]),
              ]),
    );
}

export function docFromText(text: string): Node {
    return shortCodeSchema.nodes.doc.create(null, shortCodeSchema.nodes.line.create(null, nodesFromText(text)));
}

/** The words as they are stored: `{key}` for each shop value, `\n` for each line break. */
export function textFromDoc(doc: Node): string {
    return textFromFragment(doc.content);
}

/** The same for a piece of the box, like what is copied. */
export function textFromFragment(fragment: Fragment): string {
    const parts: ShortCodePart[] = [];

    fragment.descendants((node) => {
        if (node.isText) {
            parts.push({ type: 'text', text: node.text ?? '' });
        } else if (node.type.name === 'shopValue') {
            parts.push({ type: 'value', key: String(node.attrs.key) });
        } else if (node.type.name === 'hard_break') {
            parts.push({ type: 'text', text: '\n' });
        }

        return true;
    });

    return joinShortCodes(parts);
}
