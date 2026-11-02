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
