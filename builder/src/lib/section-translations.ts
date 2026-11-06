import type { PageValue, RichSection } from '@/types';
import { blockCopyMap, copyTranslations } from './translation-copies';

export type SectionTranslations = NonNullable<PageValue['translations']>;

/** Only ids belonging to this section may leave the page in a library save. */
export function translationsForSection(
    section: RichSection,
    translations: SectionTranslations | undefined,
): SectionTranslations | undefined {
    if (!translations) return undefined;
    const ids = new Set(
        Object.keys(blockCopyMap(section.data.document, section.data.document)),
    );
    return Object.fromEntries(
        Object.entries(translations).flatMap(([locale, map]) => {
            const words = Object.fromEntries(
                Object.entries(map).filter(([key]) => {
                    const id = /^block:([^/]+)\//.exec(key)?.[1];
                    return id !== undefined && ids.has(id);
                }),
            );
            return Object.keys(words).length ? [[locale, words]] : [];
        }),
    );
}

/** A real copy action supplies the two trees; equal text never implies identity. */
export function copySectionTranslations(
    source: RichSection,
    copy: RichSection,
    translations: SectionTranslations | undefined,
): SectionTranslations | undefined {
    if (!translations) return undefined;
    const value = copyTranslations(
        { version: 2, sections: [copy], translations },
        blockCopyMap(source.data.document, copy.data.document),
    );
    return translationsForSection(copy, value.translations);
}

/** Base sections and their language maps enter history in one operation. */
export function withSectionTranslations(
    value: PageValue,
    translations: SectionTranslations | undefined,
): PageValue {
    if (!translations) return value;
    const maps = { ...value.translations };
    for (const [locale, words] of Object.entries(translations))
        maps[locale] = { ...maps[locale], ...words };
    return { ...value, translations: maps };
}
