import type { Advanced, StyleDevice } from '@/types';

/**
 * The advanced part rules, ported from Styling\Advanced and
 * Styling\CustomCss (docs/v2-plan.md, section 2).
 */

export const MAX_CLASSES = 5;

export const MAX_CSS_LENGTH = 5000;

export const HIDE_ON_DEVICES: readonly StyleDevice[] = ['desktop', 'tablet', 'phone'];

const CLASS_NAME = /^[A-Za-z][A-Za-z0-9_-]{0,40}$/;

/** Things custom CSS may never hold, in lower case. */
const BANNED = ['<', '@import', 'expression(', 'javascript:', 'behavior:'];

/** Up to 5 valid class names, joined by a space, or null when there is none. */
export function cleanClassNames(raw: unknown): string | null {
    if (typeof raw !== 'string') {
        return null;
    }

    const names = [
        ...new Set(raw.split(/\s+/).filter((name) => CLASS_NAME.test(name))),
    ].slice(0, MAX_CLASSES);

    return names.length === 0 ? null : names.join(' ');
}

/**
 * Developer CSS, or null when it is empty or breaks a rule: then it is
 * dropped whole, like the server does. `url()` may only point to an
 * https:// address or a /path.
 */
export function cleanCustomCss(raw: unknown): string | null {
    if (typeof raw !== 'string') {
        return null;
    }

    const css = raw.trim();
    const lower = css.toLowerCase();

    if (
        css === '' ||
        css.length > MAX_CSS_LENGTH ||
        BANNED.some((word) => lower.includes(word))
    ) {
        return null;
    }

    const urls = [...lower.matchAll(/url\(\s*['"]?([^'")\s]*)/g)].map(
        (match) => match[1],
    );

    return urls.every(
        (url) => url.startsWith('https://') || /^\/(?!\/)/.test(url),
    )
        ? css
        : null;
}

/** The devices to hide on, known ones only, each once, in a fixed order. */
export function cleanHideOn(raw: unknown): StyleDevice[] {
    return Array.isArray(raw)
        ? HIDE_ON_DEVICES.filter((device) => raw.includes(device))
        : [];
}

/** The advanced part with empty keys left out, or null when nothing is left. */
export function cleanAdvanced(raw: unknown): Advanced | null {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        return null;
    }

    const source = raw as Record<string, unknown>;
    const className = cleanClassNames(source.class);
    const css = cleanCustomCss(source.css);
    const hideOn = cleanHideOn(source.hide_on);
    const advanced: Advanced = {
        ...(className ? { class: className } : {}),
        ...(css ? { css } : {}),
        ...(hideOn.length > 0 ? { hide_on: hideOn } : {}),
    };

    return Object.keys(advanced).length === 0 ? null : advanced;
}
