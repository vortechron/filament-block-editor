import { describe, expect, it } from 'vitest';
import { docFromText, textFromDoc } from './short-code-doc';

/** The node types of the box's one line, in order. */
const nodesOf = (text: string) => {
    const names: string[] = [];

    docFromText(text).firstChild?.forEach((node) =>
        names.push(node.type.name === 'shopValue' ? `value:${node.attrs.key}` : node.type.name),
    );

    return names;
};

describe('the words of a text field with shop values', () => {
    it('hold each shop value as one piece and each new line as a line break', () => {
        expect(nodesOf('Hubungi {site.phone}{site.gone}\nhari ini')).toEqual([
            'text',
            'value:site.phone',
            'value:site.gone',
            'hard_break',
            'text',
        ]);
        expect(nodesOf('')).toEqual([]);
    });

    it('give back the same words, line breaks, unknown keys and plain braces included', () => {
        for (const text of [
            '',
            '{site.phone}',
            '{site.phone}{site.email}',
            'Baris satu\n{site.hours}\n\nBaris {nama} tiga {site.gone}\n',
            '\n\n',
        ]) {
            expect(textFromDoc(docFromText(text))).toBe(text);
        }
    });
});
