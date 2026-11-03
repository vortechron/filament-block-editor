import RULES from '@/generated/rules.json';

/**
 * A developer's own CSS (`advanced.css`), checked the same way as
 * Styling\CustomCss (docs/v2-plan.md, section 2, and its Deviations). The
 * shared cases in tests/fixtures/shared/custom-css.json prove the two
 * agree. The whole value is dropped when any check fails:
 *
 * - no `<` and no backslash at all;
 * - every rule's selectors each start with `selector`, also inside
 *   `@media` and `@supports`, the only at-rules allowed;
 * - no `+` or `~` combinator, no `:root`, `:host` or `:has(`, and no
 *   attribute selector on `value`;
 * - `url()` only with a path on this site (`/path`) of plain URL
 *   characters, never `//`; no `image-set()`, `src()`, `expression(`,
 *   `javascript:`, `behavior:` or `-moz-binding`;
 * - braces in balance, none hidden in a quote, no nested rules.
 *
 * PHP's own string helpers are copied on purpose (ASCII spaces, ASCII
 * lower case, length in bytes), so an odd character can not make the two
 * sides disagree.
 */

export const MAX_CSS_LENGTH = RULES.advanced.max_css_length;

/** Why the CSS was dropped. */
export type CustomCssProblem =
    | 'too-long'
    | 'characters'
    | 'comment'
    | 'banned'
    | 'url'
    | 'quotes'
    | 'shape'
    | 'selector'
    | 'reach';

export type CustomCssCheck =
    | { ok: true; css: string }
    | { ok: false; problem: CustomCssProblem | 'empty' };

/** What the builder tells a developer for each problem, in English for t(). */
export const CUSTOM_CSS_PROBLEMS: Record<CustomCssProblem, string> = {
    'too-long': 'This CSS is not saved: it is longer than :max characters.',
    characters: 'This CSS is not saved: it may not hold < or a backslash.',
    comment: 'This CSS is not saved: a comment is not closed with */.',
    banned: 'This CSS is not saved: it may not hold @import, expression(, javascript:, behavior:, -moz-binding, image-set( or src(.',
    url: 'This CSS is not saved: url() may only hold a path on this site, like url(/images/a.png), with no ? and not starting with //.',
    quotes: 'This CSS is not saved: a quote is not closed, or a quote holds { or }.',
    shape: 'This CSS is not saved: check the braces. Only @media and @supports may hold rules, and rules can not hold rules.',
    selector: 'This CSS is not saved: every selector must start with selector, like selector .bn-button.',
    reach: 'This CSS is not saved: a selector may not use + or ~, :root, :host, :has( or [value.',
};

/** PHP's \s without the u flag, and its trim(). */
const SPACE = '[ \\t\\n\\x0B\\f\\r]';
const TRIMMED = /^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g;

const BANNED = new RegExp(
    `@import|expression${SPACE}*\\(|javascript${SPACE}*:|behavior${SPACE}*:|-moz-binding|image-set${SPACE}*\\(|(?<![\\w-])src${SPACE}*\\(`,
);
const URL_OPEN = new RegExp(`url${SPACE}*\\(`, 'gi');
const URL_CALL = new RegExp(
    `url${SPACE}*\\(${SPACE}*(?:"([^"]*)"|'([^']*)'|([^'"() \\t\\n\\x0B\\f\\r]*))${SPACE}*\\)`,
    'gi',
);
const URL_PATH = /^\/[A-Za-z0-9._~!$&()*+,;=:@%/-]*$/;
const STRING = /"(?:[^"\\\n]|\\[\s\S])*"|'(?:[^'\\\n]|\\[\s\S])*'/g;
const AT_RULE = /^@(media|supports)(?![\w-])/i;
const SELECTOR = /^selector(?![\w-])/;
const OUTSIDE = /:(?:root|host|has)/;
const VALUE_ATTRIBUTE = new RegExp(`\\[${SPACE}*(?:[\\w*-]*\\|)?value(?![\\w-])`);

/** How deep @media and @supports may nest. */
const MAX_DEPTH = 3;

/** The CSS as the server keeps it, or null when it is dropped whole. */
export function cleanCustomCss(raw: unknown): string | null {
    const check = checkCustomCss(raw);

    return check.ok ? check.css : null;
}

/** The CSS as the server keeps it, or why it is dropped. */
export function checkCustomCss(raw: unknown): CustomCssCheck {
    if (typeof raw !== 'string') {
        return { ok: false, problem: 'empty' };
    }

    if (new TextEncoder().encode(raw).length > MAX_CSS_LENGTH) {
        return { ok: false, problem: 'too-long' };
    }

    if (/[<\\]/.test(raw)) {
        return { ok: false, problem: 'characters' };
    }

    const css = withoutComments(raw);

    if (css === null) {
        return { ok: false, problem: 'comment' };
    }

    if (phpTrim(css) === '') {
        return { ok: false, problem: 'empty' };
    }

    const problem =
        (BANNED.test(asciiLower(css)) ? 'banned' : null) ??
        (urlsAllowed(css) ? null : 'url') ??
        shapeProblem(css);

    return problem === null ? { ok: true, css: phpTrim(css) } : { ok: false, problem };
}

function shapeProblem(css: string): CustomCssProblem | null {
    const masked = withoutStrings(css);

    if (masked === null) {
        return 'quotes';
    }

    if (!/[{}]/.test(masked)) {
        return masked.includes('@') ? 'shape' : null;
    }

    return rules(masked, 0);
}

function withoutComments(css: string): string | null {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');

    return clean.includes('/*') ? null : clean;
}

/** Every url() is closed and points at a path on this site. */
function urlsAllowed(css: string): boolean {
    const calls = [...css.matchAll(URL_CALL)];

    if ((css.match(URL_OPEN) ?? []).length !== calls.length) {
        return false;
    }

    return calls.every((call) => {
        const url = (call[1] ?? '') + (call[2] ?? '') + (call[3] ?? '');

        return URL_PATH.test(url) && url[1] !== '/';
    });
}

/** Each quoted string emptied, or null when one hides a brace or is not closed. */
function withoutStrings(css: string): string | null {
    let hidesBrace = false;
    const masked = css.replace(STRING, (string) => {
        hidesBrace = hidesBrace || /[{}]/.test(string);

        return '""';
    });

    return hidesBrace || /["']/.test(masked.replaceAll('""', '')) ? null : masked;
}

function rules(css: string, depth: number): CustomCssProblem | null {
    let at = 0;

    while (true) {
        while (at < css.length && isSpace(css[at])) {
            at += 1;
        }

        if (at >= css.length) {
            return null;
        }

        const open = css.indexOf('{', at);
        const close = open === -1 ? null : closing(css, open);

        if (open === -1 || close === null) {
            return 'shape';
        }

        const prelude = phpTrim(css.slice(at, open));

        if (/[};]/.test(prelude)) {
            return 'shape';
        }

        const problem = rule(prelude, css.slice(open + 1, close), depth);

        if (problem !== null) {
            return problem;
        }

        at = close + 1;
    }
}

function rule(prelude: string, body: string, depth: number): CustomCssProblem | null {
    if (prelude.startsWith('@')) {
        return AT_RULE.test(prelude) && depth < MAX_DEPTH ? rules(body, depth + 1) : 'shape';
    }

    if (/[{}]/.test(body) || prelude === '') {
        return 'shape';
    }

    for (const selector of selectors(prelude)) {
        if (!SELECTOR.test(phpTrim(selector))) {
            return 'selector';
        }

        if (!staysInside(asciiLower(selector))) {
            return 'reach';
        }
    }

    return null;
}

/** Whether a selector only reaches the element and what is inside it. */
function staysInside(selector: string): boolean {
    if (OUTSIDE.test(selector) || VALUE_ATTRIBUTE.test(selector)) {
        return false;
    }

    let depth = 0;

    for (const character of selector) {
        depth += nesting(character);

        if (depth === 0 && (character === '+' || character === '~')) {
            return false;
        }
    }

    return true;
}

/** The position of the brace that closes the one at `open`. */
function closing(css: string, open: number): number | null {
    let depth = 0;

    for (let at = open; at < css.length; at += 1) {
        depth += css[at] === '{' ? 1 : css[at] === '}' ? -1 : 0;

        if (depth === 0) {
            return at;
        }
    }

    return null;
}

/** A selector list split at its top-level commas (not inside `:is(a, b)`). */
function selectors(prelude: string): string[] {
    let list: string[] = [];
    let current = '';
    let depth = 0;

    for (const character of prelude) {
        depth += nesting(character);

        if (character === ',' && depth === 0) {
            list = [...list, current];
            current = '';
        } else {
            current += character;
        }
    }

    return [...list, current];
}

function nesting(character: string): number {
    if (character === '(' || character === '[') {
        return 1;
    }

    return character === ')' || character === ']' ? -1 : 0;
}

function isSpace(character: string): boolean {
    return ' \t\n\r\x0B\f'.includes(character);
}

function phpTrim(text: string): string {
    return text.replace(TRIMMED, '');
}

function asciiLower(text: string): string {
    return text.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}
