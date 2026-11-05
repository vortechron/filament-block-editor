import type { PageLinkOption, PageMenuEntry } from '@/types';

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

/**
 * The title's page menu from the host: entries with a name and a builder
 * address on this site or on the web, at most one of them current.
 */
export function normalizePageMenu(entries: unknown): PageMenuEntry[] {
    if (!Array.isArray(entries)) {
        return [];
    }

    let hasCurrent = false;

    return entries.flatMap((entry): PageMenuEntry[] => {
        const title = typeof entry?.title === 'string' ? entry.title.trim() : '';
        const url = typeof entry?.url === 'string' ? entry.url.trim() : '';

        if (title === '' || !/^(https?:\/\/|\/(?!\/))/i.test(url)) {
            return [];
        }

        const current = entry.current === true && !hasCurrent;
        hasCurrent ||= current;

        return [{ title, url, ...(current ? { current: true } : {}) }];
    });
}

