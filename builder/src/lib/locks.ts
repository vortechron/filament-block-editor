import RULES from '@/generated/rules.json';
import type { LockKey, RichSection, Section, SectionLock } from '@/types';

/** Every lock, in the order the Lock menu lists them (PageContent::LOCKS). */
export const LOCK_KEYS: readonly LockKey[] = RULES.locks;

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

/**
 * Does a lock stop this user? Developers are never stopped; for others a
 * rich section's true lock key does. A synced section has no locks here.
 */
export function isLocked(
    section: Section | undefined,
    key: LockKey,
    developer: boolean,
): boolean {
    return (
        !developer &&
        section?.type === 'rich' &&
        section.lock?.[key] === true
    );
}

/** The section with one lock on or off. The lock is left out when empty. */
export function withLock(
    section: RichSection,
    key: LockKey,
    on: boolean,
): RichSection {
    const { lock: _old, ...rest } = section;
    const lock = cleanLock({ ...section.lock, [key]: on });

    return lock ? { ...rest, lock } : rest;
}

/**
 * A copy made by someone who is not a developer: the server drops the
 * developer-only data (locks and custom CSS) from new sections, so the
 * builder shows the copy the way it will be saved.
 */
export function withoutDeveloperData<T extends Section>(section: T): T {
    if (section.type !== 'rich') {
        return section;
    }

    const { lock: _lock, ...rest } = section;
    const { css: _css, ...advanced } = section.data.advanced ?? {};
    const { advanced: _advanced, ...data } = section.data;
    const cleanAdvanced = Object.keys(advanced).length > 0 ? { advanced } : {};

    return { ...rest, data: { ...data, ...cleanAdvanced } } as T;
}
