import type { PageLinkOption } from '@/types';

/** The host's pages without any that has no title or a url that leaves the site. */
export function normalizePageLinks(raw: unknown): PageLinkOption[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    return raw.flatMap((entry): PageLinkOption[] => {
        const title = typeof entry?.title === 'string' ? entry.title.trim().slice(0, 120) : '';
        const url: unknown = entry?.url;

        return title !== '' && typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')
            ? [{ title, url }]
            : [];
    });
}

/** The page whose url is exactly this value, if any. */
export function pageOfUrl(pages: readonly PageLinkOption[], value: string): PageLinkOption | undefined {
    return pages.find((page) => page.url === value.trim());
}
