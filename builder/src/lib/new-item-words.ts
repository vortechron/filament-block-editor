import type { Translate } from './i18n';

/**
 * The words a new item starts with, in the site's language, so it never
 * lands blank on the page and reads as what it is.
 */
export type NewItemWords = {
    heading: string;
    subheading: string;
    paragraph: string;
    bulletList: string;
    numberedList: string;
    quote: string;
    question: string;
    answer: string;
    card: string;
    column: string;
};

export function newItemWords(siteT: Translate): NewItemWords {
    return {
        heading: siteT('Your heading'),
        subheading: siteT('Your small heading'),
        paragraph: siteT('Write your words here.'),
        bulletList: siteT('First point'),
        numberedList: siteT('First step'),
        quote: siteT('Words a customer said about you.'),
        question: siteT('Your question?'),
        answer: siteT('Your answer.'),
        card: siteT('Card title'),
        column: siteT('Words for this column.'),
    };
}

/**
 * Whether a block's words are plain text (no bold or colour, no link, no
 * shop info chip), so a plain text box can change them without losing
 * anything.
 */
export function isPlainWords(content: unknown): boolean {
    if (typeof content === 'string') {
        return true;
    }

    return (
        Array.isArray(content) &&
        content.every(
            (item) =>
                typeof item === 'object' &&
                item !== null &&
                (item as { type?: unknown }).type === 'text' &&
                Object.keys((item as { styles?: object }).styles ?? {}).length === 0,
        )
    );
}
