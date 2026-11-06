import type { PageBuilderLanguage } from '@/types';

export function builderLanguageUrl(value: unknown): string | null {
    return typeof value === 'string'
        && /^(https?:\/\/|\/(?!\/))/i.test(value)
        && !/[\s\\\x00-\x1f]/.test(value)
        ? value
        : null;
}

/** Parse host options once. Invalid URLs must never become creation requests. */
export function normalizeLanguages(raw: unknown): PageBuilderLanguage[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    const entries: readonly unknown[] = raw;
    const languages: PageBuilderLanguage[] = [];
    const seen = new Set<string>();
    let hasCurrent = false;

    for (const entry of entries) {
        if (
            typeof entry !== 'object' || entry === null
            || !('locale' in entry) || !('label' in entry) || !('url' in entry)
        ) {
            continue;
        }
        const { locale, label, url } = entry;
        if (
            typeof locale !== 'string' || !/^[a-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$/.test(locale)
            || seen.has(locale) || typeof label !== 'string' || label.trim() === ''
        ) {
            continue;
        }
        const cleanUrl = builderLanguageUrl(url);
        if (url !== null && cleanUrl === null) {
            continue;
        }
        const current: boolean = 'current' in entry && entry.current === true && !hasCurrent;
        hasCurrent ||= current;
        seen.add(locale);
        languages.push({ locale, label: label.trim().slice(0, 120), url: cleanUrl, current });
    }

    return languages;
}
