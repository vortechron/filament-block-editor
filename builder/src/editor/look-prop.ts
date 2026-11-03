import { cleanAdvanced } from '@/lib/advanced';
import { cleanStyleBag } from '@/lib/style-bag';
import type { BlockLook } from '@/types';

/**
 * Every block's `look` prop: a JSON string of `{ style, advanced }`, ""
 * when empty (docs/v2-plan.md, section 2). BlockNote props are plain
 * values, so the object travels as text. The PHP side cleans and draws it.
 */
export const LOOK_PROP_SCHEMA = { look: { default: '' } } as const;

/** A block's look, cleaned. Bad JSON reads as no look at all. */
export function parseLook(raw: unknown): BlockLook {
    if (typeof raw !== 'string' || raw === '') {
        return {};
    }

    try {
        return cleanLook(JSON.parse(raw));
    } catch {
        return {};
    }
}

/** The look with empty parts left out. */
export function cleanLook(raw: unknown): BlockLook {
    const source =
        typeof raw === 'object' && raw !== null
            ? (raw as Record<string, unknown>)
            : {};
    const style = cleanStyleBag(source.style);
    const advanced = cleanAdvanced(source.advanced);

    return {
        ...(style ? { style } : {}),
        ...(advanced ? { advanced } : {}),
    };
}

/** The `look` prop for a look: compact JSON, or "" when it is empty. */
export function serializeLook(look: BlockLook): string {
    const clean = cleanLook(look);

    return Object.keys(clean).length === 0 ? '' : JSON.stringify(clean);
}
