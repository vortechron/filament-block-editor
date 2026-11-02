/**
 * A PostCSS plugin that keeps the builder's styles inside the builder's
 * root element, so nothing leaks into the host page:
 *
 * - every top-level rule gets the scope in front (`.flex` becomes
 *   `.fbe-builder .flex`), and the page root (`:root`, `html`, `body`,
 *   `:host`) becomes the scope element itself;
 * - cascade layers are removed, so the builder's rules are not beaten by
 *   a host style that sits outside any layer. Source order is kept, so
 *   Tailwind's order (theme, base, components, utilities) still holds.
 *
 * Rules inside @keyframes and nested rules (`&:hover`) are left alone.
 */
const ROOT_TOKEN = /^(?::root|:host|html|body)(?![\w-])/;
const SKIP_AT_RULES = new Set(['keyframes', '-webkit-keyframes', 'font-face', 'property', 'page', 'counter-style']);

export function scopeSelector(selector, scope) {
    let rest = selector.trim();

    if (rest === scope || (rest.startsWith(scope) && /^[\s.[:>#~+]|^$/.test(rest.slice(scope.length)))) {
        return rest;
    }

    let isRoot = false;

    for (;;) {
        const match = ROOT_TOKEN.exec(rest);

        if (!match) {
            break;
        }

        isRoot = true;
        rest = rest.slice(match[0].length);

        if (/^\s/.test(rest)) {
            const trimmed = rest.trimStart();

            if (ROOT_TOKEN.test(trimmed)) {
                rest = trimmed;
                continue;
            }

            return trimmed === '' ? scope : `${scope} ${trimmed}`;
        }
    }

    if (isRoot) {
        // `:root[data-x]` sits on the scope element itself.
        return rest === '' ? scope : `${scope}${rest}`;
    }

    return `${scope} ${rest}`;
}

function insideSkipped(node) {
    for (let parent = node.parent; parent; parent = parent.parent) {
        if (parent.type === 'rule') {
            return true;
        }

        if (parent.type === 'atrule' && SKIP_AT_RULES.has(parent.name.toLowerCase())) {
            return true;
        }
    }

    return false;
}

export function scopeCss({ scope = '.fbe-builder' } = {}) {
    return {
        postcssPlugin: 'fbe-scope-css',
        OnceExit(root) {
            // Unwrap layers first, keeping their order. Layers inside
            // layers come out on the next pass.
            for (let found = true; found; ) {
                found = false;
                root.walkAtRules('layer', (rule) => {
                    found = true;

                    if (rule.nodes && rule.nodes.length > 0) {
                        rule.replaceWith(rule.nodes);
                    } else {
                        rule.remove();
                    }
                });
            }

            root.walkRules((rule) => {
                if (insideSkipped(rule)) {
                    return;
                }

                rule.selectors = [
                    ...new Set(rule.selectors.map((selector) => scopeSelector(selector, scope))),
                ];
            });
        },
    };
}

scopeCss.postcss = true;
