import type { PageValue, RichDocument } from '@/types';

export type BlockCopyMap = Record<string, string>;

/** The duplication action knows both trees, in the order it copied them. */
export function blockCopyMap(
    source: RichDocument,
    copy: RichDocument,
): BlockCopyMap {
    const mapping: BlockCopyMap = {};
    source.forEach((block, index) => {
        const target = copy[index];
        if (!target) return;
        if (typeof block.id === 'string' && typeof target.id === 'string')
            mapping[block.id] = target.id;
        if (Array.isArray(block.children) && Array.isArray(target.children)) {
            Object.assign(
                mapping,
                blockCopyMap(
                    block.children as RichDocument,
                    target.children as RichDocument,
                ),
            );
        }
    });
    return mapping;
}

/** Only an explicit duplication action may copy language words. */
export function copyTranslations(
    value: PageValue,
    mapping: BlockCopyMap,
): PageValue {
    if (!value.translations) return value;
    let translations = value.translations;
    for (const [source, target] of Object.entries(mapping)) {
        for (const [locale, words] of Object.entries(value.translations)) {
            const copied = Object.fromEntries(
                Object.entries(words)
                    .filter(([key]) => key.startsWith(`block:${source}/`))
                    .map(([key, text]) => [
                        `block:${target}/${key.slice(`block:${source}/`.length)}`,
                        text,
                    ]),
            );
            if (Object.keys(copied).length)
                translations = {
                    ...translations,
                    [locale]: { ...translations[locale], ...copied },
                };
        }
    }
    return translations === value.translations
        ? value
        : { ...value, translations };
}

export function containsCopies(
    value: PageValue,
    mapping: BlockCopyMap,
): boolean {
    const ids = new Set<string>();
    const visit = (blocks: RichDocument) =>
        blocks.forEach((block) => {
            if (typeof block.id === 'string') ids.add(block.id);
            if (Array.isArray(block.children))
                visit(block.children as RichDocument);
        });
    value.sections.forEach((section) => {
        if (section.type === 'rich') visit(section.data.document);
    });
    return Object.values(mapping).every((id) => ids.has(id));
}
