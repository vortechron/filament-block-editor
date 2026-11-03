import { describe, expect, it } from 'vitest';
import { joinShortCodes, parseShortCodes, shortCodeKeys } from './short-codes';

describe('short codes in an own block’s words', () => {
    it('split the words into text and shop values, unknown keys and side-by-side ones too', () => {
        expect(parseShortCodes('Hubungi {site.phone} di {site.gone}{page.title}\nhari ini')).toEqual([
            { type: 'text', text: 'Hubungi ' },
            { type: 'value', key: 'site.phone' },
            { type: 'text', text: ' di ' },
            { type: 'value', key: 'site.gone' },
            { type: 'value', key: 'page.title' },
            { type: 'text', text: '\nhari ini' },
        ]);
    });

    it('leave braces around anything but a key as words', () => {
        expect(parseShortCodes('Hai {nama}, {Site.Phone} { site.phone } {a.b.c.d.e} @site.email')).toEqual([
            { type: 'text', text: 'Hai {nama}, {Site.Phone} { site.phone } {a.b.c.d.e} @site.email' },
        ]);
        expect(parseShortCodes('')).toEqual([]);
    });

    it('join back into the same words', () => {
        for (const text of [
            '',
            '{site.phone}',
            '{site.phone}{site.email}',
            'Baris satu\n{site.hours}\n\nBaris {nama} tiga {site.gone}',
            '{{site.phone}}',
        ]) {
            expect(joinShortCodes(parseShortCodes(text))).toBe(text);
        }
    });

    it('list their keys in order', () => {
        expect(shortCodeKeys('{site.phone} {nama} {site.email}{site.phone}')).toEqual([
            'site.phone',
            'site.email',
            'site.phone',
        ]);
    });
});
