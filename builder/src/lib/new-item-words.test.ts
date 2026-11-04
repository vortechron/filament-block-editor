import { describe, expect, it } from 'vitest';
import { translate } from './i18n';
import { isPlainWords, newItemWords } from './new-item-words';

describe('the words a new item starts with', () => {
    it('are in the site language', () => {
        const words = newItemWords((text) => translate(text, 'ms', {}));

        expect(words.heading).toBe('Tajuk anda');
        expect(words.paragraph).toBe('Tulis ayat anda di sini.');
        expect(words.answer).toBe('Jawapan anda.');
    });
});

describe('plain words', () => {
    it('are text with no styles, links or shop info', () => {
        expect(isPlainWords([{ type: 'text', text: 'Hai', styles: {} }])).toBe(true);
        expect(isPlainWords([])).toBe(true);
        expect(isPlainWords([{ type: 'text', text: 'Hai', styles: { bold: true } }])).toBe(false);
        expect(isPlainWords([{ type: 'link', href: 'https://a.b', content: [] }])).toBe(false);
        expect(isPlainWords([{ type: 'dynamic', props: { key: 'site.phone' } }])).toBe(false);
        expect(isPlainWords(undefined)).toBe(false);
    });
});
