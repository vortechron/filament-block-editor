/**
 * Small pure helpers shared by the editor parts. Nothing here changes its
 * input: every function returns a new array or value.
 */

/** The `t` from useT(), for helpers that cannot call the hook themselves. */
export type Translate = (text: string) => string;

export function moveItem<T>(items: T[], index: number, offset: -1 | 1): T[] {
    const target = index + offset;

    if (target < 0 || target >= items.length) {
        return items;
    }

    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];

    return next;
}

/**
 * The list with one item taken out and put back at `target`, the place
 * the dragged row was dropped on. Other items keep their order.
 */
export function moveToIndex<T>(items: T[], from: number, target: number): T[] {
    if (from < 0 || from >= items.length || from === target) {
        return items;
    }

    const without = items.filter((_, position) => position !== from);

    return [...without.slice(0, target), items[from], ...without.slice(target)];
}

export function replaceItem<T>(items: T[], index: number, item: T): T[] {
    return items.map((current, position) =>
        position === index ? item : current,
    );
}

export function insertAfter<T>(items: T[], index: number, item: T): T[] {
    return [...items.slice(0, index + 1), item, ...items.slice(index + 1)];
}
