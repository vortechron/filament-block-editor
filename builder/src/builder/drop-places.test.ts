import { describe, expect, it } from 'vitest';
import { dropPlaces } from './drop-places';

/** A section with a heading row: two columns, and a line under them. */
function section(): HTMLElement {
    const element = document.createElement('section');

    element.innerHTML = `
        <div class="bn-columns" data-item="0">
            <div class="bn-column" id="left"><h2 data-item="0.0.0">Title</h2><div data-item="0.0.1">Details</div></div>
            <div class="bn-column" id="right"><div data-item="0.1.0">Map</div></div>
        </div>
        <div aria-hidden="true"><div class="bn-columns"><div class="bn-column" id="hidden"><p data-item="4.0.0">Copy</p></div></div></div>
        <p data-item="1">Under</p>
        <div aria-hidden="true"><p data-item="2">Copy</p></div>
        <div class="bn-columns" data-item="3">
            <div class="bn-column" id="list"><ul><li data-item="3.0.0">One</li><li data-item="3.0.1">Two</li></ul></div>
        </div>`;

    return element;
}

const boxes: Record<string, [number, number, number, number]> = {
    left: [0, 0, 500, 400],
    right: [520, 0, 500, 400],
    '0': [0, 0, 1020, 400],
    '0.0.0': [0, 0, 500, 80],
    '0.0.1': [0, 100, 500, 300],
    '0.1.0': [520, 0, 500, 400],
    '1': [0, 420, 1020, 40],
    '2': [0, 480, 1020, 40],
    list: [0, 540, 1020, 100],
    '3': [0, 540, 1020, 100],
    '3.0.0': [0, 540, 1020, 40],
    '3.0.1': [0, 590, 1020, 40],
    hidden: [0, 700, 1020, 40],
};

function rectOf(element: Element): DOMRect {
    const [x, y, width, height] = boxes[element.id || element.getAttribute('data-item') || ''] ?? [0, 0, 0, 0];

    return new DOMRect(x, y, width, height);
}

describe('the places a dragged item can land on the page', () => {
    it('are the items of the column under the pointer', () => {
        expect([...dropPlaces(section(), { x: 200, y: 90 }, rectOf).keys()]).toEqual(['0.0.0', '0.0.1']);
        expect([...dropPlaces(section(), { x: 700, y: 50 }, rectOf).keys()]).toEqual(['0.1.0']);
    });

    it('are the items of a list in a column, one by one', () => {
        expect([...dropPlaces(section(), { x: 200, y: 600 }, rectOf).keys()]).toEqual(['3.0.0', '3.0.1']);
    });

    it('are the top-level items outside a column, without hidden copies', () => {
        expect([...dropPlaces(section(), { x: 200, y: 440 }, rectOf).keys()]).toEqual(['0', '1', '3']);
        expect([...dropPlaces(section(), { x: 200, y: 710 }, rectOf).keys()]).toEqual(['0', '1', '3']);
    });
});
