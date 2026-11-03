import RULES from '@/generated/rules.json';
import type { Advanced, StyleDevice } from '@/types';
import { cleanCustomCss } from './custom-css';

export { checkCustomCss, cleanCustomCss, MAX_CSS_LENGTH } from './custom-css';

/**
 * The advanced part rules, from Styling\Advanced and Styling\CustomCss
 * (docs/v2-plan.md, section 2, and its Deviations). The limits come from
 * the exported rules (builder/src/generated/rules.json).
 */

export const MAX_CLASSES = RULES.advanced.max_classes;

export const HIDE_ON_DEVICES: readonly StyleDevice[] = RULES.advanced.devices;

const CLASS_NAME = new RegExp(`^(?:${RULES.advanced.class_name})$`);

/** The package's own style hooks start like this, so a class name may not. */
const RESERVED_PREFIX = RULES.advanced.reserved_class_prefix;

/**
 * Up to 5 valid class names, joined by a space, or null when there is
 * none. Names that start with `fbe-` are left out.
 */
export function cleanClassNames(raw: unknown): string | null {
    if (typeof raw !== 'string') {
        return null;
    }

    const names = [
        ...new Set(
            raw
                .split(/\s+/)
                .filter(
                    (name) =>
                        CLASS_NAME.test(name) &&
                        !name.toLowerCase().startsWith(RESERVED_PREFIX),
                ),
        ),
    ].slice(0, MAX_CLASSES);

    return names.length === 0 ? null : names.join(' ');
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
