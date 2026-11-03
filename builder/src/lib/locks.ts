import type { LockKey, Section, SectionLock } from '@/types';

/** Every lock, in the order the Lock menu lists them. Mirrors the PHP side. */
export const LOCK_KEYS: readonly LockKey[] = ['move', 'remove', 'content', 'style'];

/**
 * A lock with only its true keys, or null when nothing is locked. Same
 * rule as Content\PageValue: each key is present only when true.
 */
export function cleanLock(raw: unknown): SectionLock | null {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        return null;
    }

    const lock = Object.fromEntries(
        LOCK_KEYS.filter(
            (key) => (raw as Record<string, unknown>)[key] === true,
        ).map((key) => [key, true]),
    ) as SectionLock;

    return Object.keys(lock).length === 0 ? null : lock;
}
