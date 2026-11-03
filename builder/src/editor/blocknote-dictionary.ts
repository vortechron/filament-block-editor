import type { Dictionary } from '@blocknote/core';
import { en } from '@blocknote/core/locales';
import { locales as multiColumnLocales } from '@blocknote/xl-multi-column';
import type { Locale } from '@/lib/i18n';
import { BLOCKNOTE_MS } from '@/lang/blocknote-ms';

/** BlockNote's own words, and the columns' (xl-multi-column) words too. */
export type PageDictionary = Dictionary & {
    multi_column: typeof multiColumnLocales.en;
};

/**
 * The words BlockNote shows inside a section's editor: its hints, "/"
 * menu, toolbars, and table, link and image menus. Malay is laid over the
 * English dictionary, so anything not translated yet shows in English.
 */
export function blockNoteDictionary(locale: Locale): PageDictionary {
    const english = { ...en, multi_column: multiColumnLocales.en } as PageDictionary;

    return locale === 'ms'
        ? (laidOver(english, BLOCKNOTE_MS) as PageDictionary)
        : english;
}

/**
 * `over` on top of `base`, key by key. Search words (arrays) are added to
 * the English ones, so "/heading" still finds a heading in Malay.
 */
function laidOver(base: unknown, over: unknown): unknown {
    if (over === undefined) {
        return base;
    }

    if (Array.isArray(base) && Array.isArray(over)) {
        return [...new Set([...base, ...over])];
    }

    if (isPlainObject(base) && isPlainObject(over)) {
        return Object.fromEntries(
            [...new Set([...Object.keys(base), ...Object.keys(over)])].map((key) => [
                key,
                laidOver(base[key], over[key]),
            ]),
        );
    }

    return over;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
