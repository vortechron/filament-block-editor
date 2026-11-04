/** A point in the builder window. */
export type Point = { x: number; y: number };

/**
 * The items a dragged item can land beside, in one section of the page,
 * each by its `data-item` place with its box: inside a row of columns, the
 * items of the column under the pointer ("0.1.0", the first item of the
 * second column of the first item; a list's items one by one); anywhere
 * else, the section's top-level items ("2"). Copies hidden from screen
 * readers, like the ticker's second run, are left out. `rectOf` gives an
 * element's box in the builder window.
 */
export function dropPlaces(
    section: Element,
    at: Point,
    rectOf: (element: Element) => DOMRect,
): Map<string, DOMRect> {
    const column = columnUnder(section, at, rectOf);
    const candidates = column
        ? columnItems(column)
        : shown(section.querySelectorAll('[data-item]')).filter(
              (element) => !(element.getAttribute('data-item') ?? '').includes('.'),
          );
    const places = new Map<string, DOMRect>();

    for (const element of candidates) {
        const path = element.getAttribute('data-item') ?? '';

        if (path !== '' && !places.has(path)) {
            places.set(path, rectOf(element));
        }
    }

    return places;
}

/**
 * The smallest shown column with items that holds the point, or null: in
 * the gap between two columns, or over a column with no items, the drop
 * goes before or after the whole row.
 */
function columnUnder(
    section: Element,
    at: Point,
    rectOf: (element: Element) => DOMRect,
): Element | null {
    let found: Element | null = null;
    let foundArea = Number.POSITIVE_INFINITY;

    for (const column of shown(section.querySelectorAll('.bn-column'))) {
        const rect = rectOf(column);
        const holds = at.x >= rect.left && at.x <= rect.right && at.y >= rect.top && at.y <= rect.bottom;

        if (holds && columnItems(column).length > 0 && rect.width * rect.height < foundArea) {
            found = column;
            foundArea = rect.width * rect.height;
        }
    }

    return found;
}

/**
 * A column's own items, not those of a row or a card inside it: the
 * marked elements whose nearest column is this one, at the column's own
 * depth (a list's items sit inside its <ul>, at that depth too).
 */
function columnItems(column: Element): Element[] {
    const inside = [...column.querySelectorAll('[data-item]')].filter(
        (element) => element.parentElement?.closest('.bn-column') === column,
    );
    const depth = (element: Element) => (element.getAttribute('data-item') ?? '').split('.').length;
    const own = Math.min(...inside.map(depth));

    return inside.filter((element) => depth(element) === own);
}

function shown(elements: Iterable<Element>): Element[] {
    return [...elements].filter((element) => !element.closest('[aria-hidden="true"]'));
}
