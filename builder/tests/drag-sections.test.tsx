import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { loadCanvasPage } from './frame-helpers';
import { makeAdapter, mountBuilder } from './mount-helpers';

/** The hero page, under a header the host built from sections. */
const PAGE_UNDER_BUILT_HEADER = `<!doctype html><html><head></head><body>
<div data-part="header" class="sf-page">
<div data-block-id="head0001"><nav><a href="/" data-item="0">Kedai Buku</a></nav></div>
</div>
<div data-block-id="hero0001"><section><h1 data-item="0">Selamat datang</h1></section></div>
</body></html>`;

/**
 * jsdom lays nothing out, so each box the drop line is worked out from
 * gets a place: the canvas page, and sections stacked from the top.
 */
function layOut(page: Document, heights: Record<string, number>) {
    const canvas = document.querySelector('[data-canvas-page]') as HTMLElement;

    canvas.getBoundingClientRect = () => new DOMRect(0, 0, 800, 2000);
    // Near the top edge the page scrolls by itself, which jsdom lacks.
    (page.defaultView as Window).scrollBy = () => {};

    let top = 0;

    for (const [id, height] of Object.entries(heights)) {
        const box = new DOMRect(0, top, 800, height);

        (page.querySelector(`[data-block-id="${id}"]`) as HTMLElement).getBoundingClientRect = () => box;
        top += height;
    }
}

/** Drags a sidebar tile with the mouse and lets go over a point on the page. */
async function dragTo(tile: HTMLElement, at: { x: number; y: number }) {
    await act(async () => {
        fireEvent.mouseDown(tile, { button: 0, clientX: 900, clientY: 300 });
    });
    await act(async () => {
        fireEvent.mouseMove(document, { clientX: 880, clientY: 300 });
    });
    await act(async () => {
        fireEvent.mouseMove(document, { clientX: at.x, clientY: at.y });
    });
    await act(async () => {
        fireEvent.mouseUp(document, { clientX: at.x, clientY: at.y });
    });
}

describe('dragging a ready-made section onto the page', () => {
    it('lands above the first section when let go over a header made of sections', async () => {
        const adapter = makeAdapter();

        adapter.preview.mockImplementation(async () => PAGE_UNDER_BUILT_HEADER);

        const { builder } = mountBuilder({ adapter });
        const page = await loadCanvasPage();

        layOut(page, { head0001: 100, hero0001: 600 });
        await dragTo(screen.getByRole('button', { name: /^FAQ/ }), { x: 400, y: 20 });

        const sections = builder.getValue().sections;

        expect(sections).toHaveLength(2);
        expect(sections[1].id).toBe('hero0001');
    });
});

const SYNCED = [
    {
        id: 12,
        title: 'Footer CTA',
        editUrl: '/admin/sections/12/build',
        section: { id: 'orig0001', type: 'rich' as const, data: { layout: 'banner' as const, document: [] } },
    },
];

describe('dragging a synced section onto the page', () => {
    it('puts a ref to it where it is let go', async () => {
        const adapter = makeAdapter();

        adapter.preview.mockImplementation(async () => PAGE_UNDER_BUILT_HEADER);

        const { builder } = mountBuilder({ adapter, syncedSections: SYNCED as never });
        const page = await loadCanvasPage();

        layOut(page, { head0001: 100, hero0001: 600 });
        await dragTo(screen.getByRole('button', { name: /^Footer CTA/ }), { x: 400, y: 150 });

        const [added, hero] = builder.getValue().sections;

        expect(added).toEqual({ id: added.id, type: 'ref', ref: 12 });
        expect(hero.id).toBe('hero0001');
    });
});
