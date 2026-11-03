import RULES from '@/generated/rules.json';

/**
 * Short codes in an own block's text and textarea fields: `{site.phone}`
 * anywhere in the words stands for that shop value (docs/v2-plan.md,
 * section 6). The page fills each one in when it is drawn
 * (Content\DynamicValues::fill()). Braces around anything that is not a
 * dynamic value key, like `{nama}`, are plain words.
 */

/** One `{key}`, with the key rule of Content\DynamicValues::KEY. */
const SHORT_CODE = new RegExp(`\\{(${RULES.dynamic_key})\\}`, 'g');

/** The keys of the short codes in a text, in order, repeats included. */
export function shortCodeKeys(text: string): string[] {
    return [...text.matchAll(SHORT_CODE)].map((match) => match[1]);
}

/** A piece of a text field's words: plain text, or one shop value. */
export type ShortCodePart = { type: 'text'; text: string } | { type: 'value'; key: string };

/** The words as text and shop values, in order. Unknown keys are kept. */
export function parseShortCodes(text: string): ShortCodePart[] {
    const parts: ShortCodePart[] = [];
    let last = 0;

    for (const match of text.matchAll(SHORT_CODE)) {
        if (match.index > last) {
            parts.push({ type: 'text', text: text.slice(last, match.index) });
        }

        parts.push({ type: 'value', key: match[1] });
        last = match.index + match[0].length;
    }

    if (last < text.length) {
        parts.push({ type: 'text', text: text.slice(last) });
    }

    return parts;
}

/** The words as they are stored, with `{key}` for each shop value. */
export function joinShortCodes(parts: readonly ShortCodePart[]): string {
    return parts.map((part) => (part.type === 'text' ? part.text : `{${part.key}}`)).join('');
}
