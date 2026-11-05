const SVG_NS = 'http://www.w3.org/2000/svg';

/** The plain shapes an icon picture may hold. */
const ELEMENTS = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);

/** How those shapes may be drawn: no links, scripts, handlers or styles. */
const ATTRIBUTES = new Set([
    'xmlns', 'viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap',
    'stroke-linejoin', 'stroke-miterlimit', 'fill-rule', 'clip-rule', 'opacity', 'fill-opacity',
    'stroke-opacity', 'transform', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'x2', 'y1',
    'y2', 'points', 'class', 'aria-hidden', 'focusable',
]);

/**
 * An icon picture from the host (Field::icons()) cut down to plain shapes,
 * so it can be drawn in the builder safely: only the shape elements and
 * drawing attributes above are kept, so no script, link, style or event
 * handler survives. Null for anything that is not an `<svg>`.
 */
export function safeSvg(markup: string): string | null {
    if (!markup.trim().startsWith('<svg')) {
        return null;
    }

    // A picture written without its namespace is still an SVG.
    const source = /^\s*<svg[^>]*\sxmlns=/.test(markup) ? markup : markup.replace('<svg', `<svg xmlns="${SVG_NS}"`);
    const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
    const root = doc.documentElement;

    if (root.localName !== 'svg' || root.namespaceURI !== SVG_NS || doc.getElementsByTagName('parsererror').length > 0) {
        return null;
    }

    clean(root);

    return new XMLSerializer().serializeToString(root);
}

function clean(element: Element): void {
    for (const attribute of [...element.attributes]) {
        if (!ATTRIBUTES.has(attribute.name) || /url\(|javascript:/i.test(attribute.value)) {
            element.removeAttribute(attribute.name);
        }
    }

    for (const child of [...element.children]) {
        if (ELEMENTS.has(child.localName) && child.localName !== 'svg') {
            clean(child);
        } else {
            child.remove();
        }
    }
}
