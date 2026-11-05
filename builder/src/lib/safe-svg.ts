const SVG_NS = 'http://www.w3.org/2000/svg';

/** The plain shapes an icon picture may hold. */
const ELEMENTS = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);

/** How those shapes may be drawn: no links, scripts, handlers or styles. */
const ATTRIBUTES = new Set([
    'viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap',
    'stroke-linejoin', 'stroke-miterlimit', 'fill-rule', 'clip-rule', 'opacity', 'fill-opacity',
    'stroke-opacity', 'transform', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'x2', 'y1',
    'y2', 'points', 'class', 'aria-hidden', 'focusable',
]);

/**
 * An icon picture from the host (Field::icons()) rebuilt from plain
 * shapes, so it can be drawn in the builder safely. Nothing of the
 * original is kept but the shape elements and drawing attributes above:
 * no script, link, style, event handler, text, comment, processing
 * instruction or character data (a browser could read those as HTML when
 * the picture is put in the page). Null for anything that is not an
 * `<svg>`.
 */
export function safeSvg(markup: string): string | null {
    if (!markup.trim().startsWith('<svg')) {
        return null;
    }

    // A picture written without its namespace is still an SVG.
    const source = /^\s*<svg[^>]*\sxmlns=/.test(markup) ? markup : markup.replace('<svg', `<svg xmlns="${SVG_NS}"`);
    const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
    const root = parsed.documentElement;

    if (root.localName !== 'svg' || root.namespaceURI !== SVG_NS || parsed.getElementsByTagName('parsererror').length > 0) {
        return null;
    }

    const output = document.implementation.createDocument(SVG_NS, null, null);

    return new XMLSerializer().serializeToString(rebuild(root, output));
}

/** A fresh copy of an allowed element: its allowed attributes and shapes. */
function rebuild(element: Element, output: XMLDocument): Element {
    const copy = output.createElementNS(SVG_NS, element.localName);

    for (const attribute of [...element.attributes]) {
        if (attribute.namespaceURI === null && ATTRIBUTES.has(attribute.name) && !/url\(|javascript:/i.test(attribute.value)) {
            copy.setAttribute(attribute.name, attribute.value);
        }
    }

    for (const child of [...element.children]) {
        if (child.namespaceURI === SVG_NS && ELEMENTS.has(child.localName) && child.localName !== 'svg') {
            copy.appendChild(rebuild(child, output));
        }
    }

    return copy;
}
