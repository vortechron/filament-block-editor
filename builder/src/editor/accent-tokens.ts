import type { CSSProperties } from 'react';

const FALLBACK_ACCENT = '#2563eb';

/**
 * The page's accent colour and the shades worked out from it, as the CSS
 * variables the public page sets on <body>. Worked out the same way as
 * the public page's own accent tokens, so the editor and the page
 * agree.
 */
export function accentTokens(accentColor: string): CSSProperties {
    const accent = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(accentColor)
        ? accentColor.toLowerCase()
        : FALLBACK_ACCENT;
    const hex =
        accent.length === 4
            ? accent
                  .slice(1)
                  .split('')
                  .map((digit) => digit + digit)
                  .join('')
            : accent.slice(1);
    const channels = [0, 2, 4].map((start) =>
        parseInt(hex.slice(start, start + 2), 16),
    );
    const [red, green, blue] = channels.map((channel) => {
        const share = channel / 255;

        return share <= 0.03928
            ? share / 12.92
            : ((share + 0.055) / 1.055) ** 2.4;
    });
    // Light accent colours get dark button text, dark ones get white.
    const ink =
        0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.3
            ? '#111827'
            : '#ffffff';
    const mixWithWhite = (share: number): string =>
        '#' +
        channels
            .map((channel) =>
                Math.round(255 - (255 - channel) * share)
                    .toString(16)
                    .padStart(2, '0'),
            )
            .join('');

    return {
        '--accent': accent,
        '--accent-ink': ink,
        '--accent-tint': mixWithWhite(0.1),
        '--accent-soft': mixWithWhite(0.3),
    } as CSSProperties;
}
