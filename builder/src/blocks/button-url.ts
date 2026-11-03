import { dynamicRefKey } from '@/lib/dynamic-values';

/**
 * The links a button may point to, the same allow-list as the PHP
 * renderer: web, mail and phone links, an anchor on the page (#about) and
 * a path on the same site (/contact). Anything else gets no link.
 */
const ALLOWED = [
    /^https?:\/\/[^\s/?#]+[^\s]*$/i,
    /^mailto:[^\s]+$/i,
    /^tel:[^\s]+$/i,
    /^#[^\s#]+$/,
    /^\/(?!\/)[^\s]*$/,
];

/** The link to use, or null when the button should not link anywhere. */
export function safeButtonUrl(url: unknown): string | null {
    if (typeof url !== 'string') {
        return null;
    }

    const trimmed = url.trim();

    return ALLOWED.some((pattern) => pattern.test(trimmed)) ? trimmed : null;
}

/**
 * A link as it is stored, the same rule as Urls::linkOrReference(): an
 * allowed address, or a shop link such as `@site.whatsapp` (resolved and
 * checked when the page is drawn). Null when neither.
 */
export function linkOrReference(url: unknown): string | null {
    return safeButtonUrl(url) ?? (dynamicRefKey(url) === null ? null : (url as string));
}
