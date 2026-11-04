import { createContext, useContext } from 'react';
import ms from '@/lang/ms';

/**
 * The builder comes in Malay and English. Text is written in English in
 * the components and looked up in the Malay dictionary: `t('Save')` shows
 * "Simpan" in Malay. English shows the text as written. A text missing
 * from the dictionary shows in English, and i18n.test.ts fails.
 *
 * The host can change any text with the `strings` option, keyed by the
 * English text: `strings: { Save: 'Terbitkan' }`.
 */
export type Locale = 'ms' | 'en';

/** English text, as written in the component, to the text shown. */
export type Messages = Readonly<Record<string, string>>;

export type Replacements = Readonly<Record<string, string | number>>;

export type Translate = (text: string, replacements?: Replacements) => string;

const DICTIONARIES: Record<Locale, Messages> = { ms, en: {} };

export function isLocale(value: unknown): value is Locale {
    return value === 'ms' || value === 'en';
}

/**
 * Looks a text up in the host's overrides, then in the locale's
 * dictionary. `:name` in the text is replaced from `replacements`, as in
 * Laravel.
 */
export function translate(
    text: string,
    locale: Locale,
    overrides: Messages,
    replacements?: Replacements,
): string {
    const dictionary = DICTIONARIES[locale];
    const translated = Object.hasOwn(overrides, text)
        ? overrides[text]
        : Object.hasOwn(dictionary, text)
          ? dictionary[text]
          : text;

    if (!replacements) {
        return translated;
    }

    return translated.replace(/:([A-Za-z_]+)/g, (placeholder, name: string) =>
        Object.hasOwn(replacements, name)
            ? String(replacements[name])
            : placeholder,
    );
}

/**
 * The builder's language, the host's texts, and the language of the words
 * the builder puts on the page (the site's; the builder's when not given).
 */
export type I18n = { locale: Locale; strings: Messages; contentLocale?: Locale };

export const I18nContext = createContext<I18n>({ locale: 'ms', strings: {} });

export function useLocale(): Locale {
    return useContext(I18nContext).locale;
}

/** Returns `t`, which shows English text in the builder's language. */
export function useT(): Translate {
    const { locale, strings } = useContext(I18nContext);

    return (text, replacements) =>
        translate(text, locale, strings, replacements);
}

/**
 * The `t` for words the builder puts on the page, which visitors read: a
 * new form's labels and button, a new button's words. They are in the
 * site's language. The host's texts change the builder's own words, so
 * they apply only when the site and the builder share a language.
 */
export function contentTranslator({ locale, strings, contentLocale = locale }: I18n): Translate {
    const overrides = contentLocale === locale ? strings : {};

    return (text, replacements) =>
        translate(text, contentLocale, overrides, replacements);
}

/** Returns contentTranslator() for the builder's languages. */
export function useContentT(): Translate {
    return contentTranslator(useContext(I18nContext));
}
