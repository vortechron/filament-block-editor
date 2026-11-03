import { describe, expect, it } from 'vitest';
import {
    blockAtPath,
    isTextItem,
    nearestPlace,
    pathOfBlock,
    planUpdate,
    type PageDrawing,
    readDrawing,
} from './page-frame-updates';

function drawing(frame: string, sections: [string, string][]): PageDrawing {
    return { frame, sections: new Map(sections) };
}

describe('updating the page on the canvas', () => {
    const before = drawing('<body class="page">', [
        ['hero1', '<h1>Kedai Buku</h1>'],
        ['tick1', '<li>Buka setiap hari</li>'],
    ]);

    it('draws the whole page the first time', () => {
        expect(planUpdate(null, before)).toEqual({ kind: 'reload' });
    });

    it('swaps only the sections whose words changed', () => {
        const after = drawing('<body class="page">', [
            ['hero1', '<h1>Kedai Buku Pak Long</h1>'],
            ['tick1', '<li>Buka setiap hari</li>'],
        ]);

        expect(planUpdate(before, after)).toEqual({
            kind: 'swap',
            sectionIds: ['hero1'],
        });
    });

    it('does nothing when nothing changed', () => {
        expect(
            planUpdate(before, drawing(before.frame, [...before.sections])),
        ).toEqual({
            kind: 'none',
        });
    });

    it('draws the whole page again when the frame or the order changed', () => {
        const newFrame = drawing('<body class="page dark">', [
            ...before.sections,
        ]);
        const newOrder = drawing(before.frame, [
            ['tick1', '<li>Buka setiap hari</li>'],
            ['hero1', '<h1>Kedai Buku</h1>'],
        ]);
        const newSection = drawing(before.frame, [
            ...before.sections,
            ['faq1', '<details></details>'],
        ]);

        expect(planUpdate(before, newFrame)).toEqual({ kind: 'reload' });
        expect(planUpdate(before, newOrder)).toEqual({ kind: 'reload' });
        expect(planUpdate(before, newSection)).toEqual({ kind: 'reload' });
    });
});

describe('finding a clicked item in the editor', () => {
    const blocks = [
        { id: 'h', type: 'heading', children: [] },
        {
            id: 'cols',
            type: 'columnList',
            children: [
                {
                    id: 'left',
                    type: 'column',
                    children: [{ id: 'p1', type: 'paragraph', children: [] }],
                },
                {
                    id: 'right',
                    type: 'column',
                    children: [{ id: 'img', type: 'image', children: [] }],
                },
            ],
        },
    ];

    it('follows the place the preview marked down into columns and cards', () => {
        expect(blockAtPath(blocks, '0')?.id).toBe('h');
        expect(blockAtPath(blocks, '1.1.0')?.id).toBe('img');
    });

    it('finds nothing for a place that is not in the document', () => {
        expect(blockAtPath(blocks, '5')).toBeNull();
        expect(blockAtPath(blocks, '1.4.0')).toBeNull();
        expect(blockAtPath(blocks, 'x')).toBeNull();
    });

    it('works out the place of an item, to mark it on the preview', () => {
        expect(pathOfBlock(blocks, 'h')).toBe('0');
        expect(pathOfBlock(blocks, 'p1')).toBe('1.0.0');
        expect(pathOfBlock(blocks, 'gone')).toBeNull();
    });

    it('opens the words for text, and the settings for everything else', () => {
        expect(isTextItem('heading')).toBe(true);
        expect(isTextItem('bulletListItem')).toBe(true);
        expect(isTextItem('image')).toBe(false);
        expect(isTextItem('button')).toBe(false);
        expect(isTextItem('ownBlock')).toBe(false);
    });
});

describe('dropping an item between the items of a section', () => {
    const column = [
        { key: 'a', left: 0, right: 400, top: 0, bottom: 40 },
        { key: 'b', left: 0, right: 400, top: 60, bottom: 100 },
    ];

    it('goes before or after the item nearest the pointer', () => {
        expect(nearestPlace(column, { x: 100, y: 10 })).toEqual({
            key: 'a',
            placement: 'before',
        });
        expect(nearestPlace(column, { x: 100, y: 35 })).toEqual({
            key: 'a',
            placement: 'after',
        });
        expect(nearestPlace(column, { x: 100, y: 95 })).toEqual({
            key: 'b',
            placement: 'after',
        });
    });

    it('goes after the last item when the pointer is below every item', () => {
        expect(nearestPlace(column, { x: 100, y: 500 })).toEqual({
            key: 'b',
            placement: 'after',
        });
    });

    it('finds the card under the pointer in a row of cards', () => {
        const row = [
            { key: 'card1', left: 0, right: 300, top: 0, bottom: 200 },
            { key: 'card2', left: 320, right: 620, top: 0, bottom: 200 },
        ];

        expect(nearestPlace(row, { x: 400, y: 150 })).toEqual({
            key: 'card2',
            placement: 'after',
        });
        // In the gap beside a card, it goes on that side of it.
        expect(nearestPlace(row, { x: 315, y: 20 })).toEqual({
            key: 'card2',
            placement: 'before',
        });
    });

    it('finds the words beside a big photo, as in a showcase layout', () => {
        const showcase = [
            { key: 'photo', left: 0, right: 500, top: 0, bottom: 500 },
            { key: 'name', left: 540, right: 900, top: 20, bottom: 80 },
            { key: 'text', left: 540, right: 900, top: 100, bottom: 140 },
        ];

        expect(nearestPlace(showcase, { x: 700, y: 130 })).toEqual({
            key: 'text',
            placement: 'after',
        });
    });

    it('has no place in a section with no items', () => {
        expect(nearestPlace([], { x: 0, y: 10 })).toBeNull();
    });
});

/** A page with a header the host built from sections, as the server draws it. */
function builtPage(phone: string, title: string): string {
    return `<!doctype html><html><body>
<div data-part="header" class="sf-page"><div data-block-id="head0001"><p>${phone}</p></div></div>
<div data-block-id="hero0001"><h1>${title}</h1></div>
</body></html>`;
}

describe('reading a drawing of the page', () => {
    it('splits out only the sections of the page being built', () => {
        const drawing = readDrawing(builtPage('012-345 6789', 'Kedai Buku'));

        expect([...drawing.sections]).toEqual([['hero0001', '<h1>Kedai Buku</h1>']]);
        expect(drawing.frame).toContain('012-345 6789');
    });

    it('draws the whole page again when the header made of sections changed', () => {
        const before = readDrawing(builtPage('012-345 6789', 'Kedai Buku'));

        expect(planUpdate(before, readDrawing(builtPage('013-000 1111', 'Kedai Buku')))).toEqual({
            kind: 'reload',
        });
        expect(planUpdate(before, readDrawing(builtPage('012-345 6789', 'Kedai Buku Pak Long')))).toEqual({
            kind: 'swap',
            sectionIds: ['hero0001'],
        });
    });
});
