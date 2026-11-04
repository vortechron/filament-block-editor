/** A point in the builder window. */
export type Point = { x: number; y: number };

/**
 * The items a dragged item can land beside, in one section of the page,
 * each by its `data-item` place with its box: inside a row of columns, the
 * items of the column under the pointer ("0.1.0", the first item of the
 * second column of the first item); anywhere else, the section's top-level
 * items ("2"). Copies hidden from screen readers, like the ticker's
 * second run, are left out. `rectOf` gives an element's box in the builder
 * window.
 */
export function dropPlaces(
    section: Element,
    at: Point,
    rectOf: (element: Element) => DOMRect,
): Map<string, DOMRect> {
    const column = columnUnder(section, at, rectOf);
    const candidates = column
        ? [...column.children]
        : [...section.querySelectorAll('[data-item]')].filter(
              (element) => !(element.getAttribute('data-item') ?? '').includes('.'),
          );
    const places = new Map<string, DOMRect>();

    for (const element of candidates) {
        const path = element.getAttribute('data-item') ?? '';

        if (path !== '' && !places.has(path) && !element.closest('[aria-hidden="true"]')) {
            places.set(path, rectOf(element));
        }
    }

    return places;
}

/**
 * The smallest column with items that holds the point, or null: in the
 * gap between two columns, or over a column with no items, the drop goes
 * before or after the whole row.
 */
function columnUnder(
    section: Element,
    at: Point,
    rectOf: (element: Element) => DOMRect,
): Element | null {
    let found: Element | null = null;
    let foundArea = Number.POSITIVE_INFINITY;

    for (const column of section.querySelectorAll('.bn-column')) {
        const rect = rectOf(column);
        const holds = at.x >= rect.left && at.x <= rect.right && at.y >= rect.top && at.y <= rect.bottom;
        const hasItems = [...column.children].some((child) => child.hasAttribute('data-item'));

        if (holds && hasItems && rect.width * rect.height < foundArea) {
            found = column;
            foundArea = rect.width * rect.height;
        }
    }

    return found;
}
