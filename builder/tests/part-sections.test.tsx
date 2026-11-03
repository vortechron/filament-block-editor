import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { loadCanvasPage } from './frame-helpers';
import { makeAdapter, mountBuilder } from './mount-helpers';

/**
 * A header and footer the host built with the page builder: each is made
 * of sections of its own (SitePageRenderer::part() in the CMS). Those
 * sections are not sections of the page being built.
 */
const PAGE_WITH_BUILT_PARTS = `<!doctype html><html><head></head><body>
<div data-part="header" class="sf-page">
<div data-block-id="head0001"><nav><a href="/" data-item="0">Kedai Buku</a></nav></div>
<div data-block-id="head0002" data-hidden><p data-item="0">Promosi raya</p></div>
</div>
<div data-block-id="hero0001"><section><h1 data-item="0">Selamat datang</h1></section></div>
<div data-part="footer" class="sf-page">
<div data-block-id="foot0001"><p data-item="0">© Kedai Buku</p></div>
</div>
</body></html>`;

const PARTS = [
    { key: 'header' as const, title: 'Header kedai', editUrl: '/admin/parts/header/build' },
    { key: 'footer' as const, title: 'Footer kedai', editUrl: '/admin/parts/footer/build' },
];

function mountWithBuiltParts() {
    const adapter = makeAdapter();

    adapter.preview.mockImplementation(async () => PAGE_WITH_BUILT_PARTS);

    return mountBuilder({ adapter, parts: PARTS });
}

function sectionOn(page: Document, id: string): HTMLElement {
    return page.querySelector(`[data-block-id="${id}"]`) as HTMLElement;
}

describe('a header and footer made of sections', () => {
    it('open the part panel when tapped, not an empty section panel', async () => {
        mountWithBuiltParts();

        const page = await loadCanvasPage();

        fireEvent.click(sectionOn(page, 'head0001').querySelector('a') as Element);

        expect(await screen.findByText('Header kedai')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Edit header' }).getAttribute('href')).toBe(
            '/admin/parts/header/build',
        );
        expect(page.querySelector('[data-part="header"]')?.hasAttribute('data-builder-picked')).toBe(true);
        expect(sectionOn(page, 'head0001').hasAttribute('data-builder-picked')).toBe(false);

        fireEvent.click(sectionOn(page, 'foot0001').querySelector('p') as Element);

        expect(await screen.findByRole('link', { name: 'Edit footer' })).toBeTruthy();
    });

    it('give their own sections no section label, picked mark or hidden badge', async () => {
        mountWithBuiltParts();

        const page = await loadCanvasPage();

        fireEvent.click(sectionOn(page, 'hero0001').querySelector('h1') as Element);
        expect(await screen.findByText('Words in this section')).toBeTruthy();

        const hero = sectionOn(page, 'hero0001');

        expect(hero.getAttribute('data-builder-label')).toBe('1. Hero');
        expect(hero.hasAttribute('data-builder-picked')).toBe(true);

        for (const id of ['head0001', 'head0002', 'foot0001']) {
            const own = sectionOn(page, id);

            expect(own.hasAttribute('data-builder-label')).toBe(false);
            expect(own.hasAttribute('data-builder-picked')).toBe(false);
            expect(own.querySelector('[data-builder-hidden-badge]')).toBeNull();
        }
    });
});

/**
 * The header builder in the CMS: the header being built, then the home
 * page's content wrapped in `data-part="page"` so it looks real.
 */
const HEADER_BUILDER_PAGE = `<!doctype html><html><head></head><body>
<div class="sf-page" data-preview>
<div data-block-id="hero0001"><section><h1 data-item="0">Selamat datang</h1></section></div>
</div>
<div data-part="page" class="sf-page">
<div data-block-id="home0001"><h2 data-item="0">Buku baru setiap minggu</h2></div>
</div>
</body></html>`;

describe('the home page around the header being built', () => {
    it('picks nothing when tapped, and gets no marks', async () => {
        const adapter = makeAdapter();

        adapter.preview.mockImplementation(async () => HEADER_BUILDER_PAGE);
        mountBuilder({ adapter, kind: 'header' });

        const page = await loadCanvasPage();

        fireEvent.click(sectionOn(page, 'hero0001').querySelector('h1') as Element);
        expect(await screen.findByText('Words in this section')).toBeTruthy();

        fireEvent.click(sectionOn(page, 'home0001').querySelector('h2') as Element);

        expect(screen.queryByText('Words in this section')).toBeNull();
        expect(screen.getByRole('tablist', { name: 'What to add' })).toBeTruthy();

        const home = sectionOn(page, 'home0001');

        expect(home.hasAttribute('data-builder-label')).toBe(false);
        expect(home.hasAttribute('data-builder-picked')).toBe(false);
        expect(page.querySelector('[data-part="page"]')?.hasAttribute('data-builder-label')).toBe(false);
    });

    it('does not look clickable, while the section being built does', async () => {
        const adapter = makeAdapter();

        adapter.preview.mockImplementation(async () => HEADER_BUILDER_PAGE);
        mountBuilder({ adapter, kind: 'header' });

        const page = await loadCanvasPage();
        const cursor = (element: Element | null) =>
            (page.defaultView as Window).getComputedStyle(element as Element).cursor;

        expect(cursor(sectionOn(page, 'hero0001'))).toBe('pointer');
        expect(cursor(page.querySelector('[data-part="page"]'))).not.toBe('pointer');
        expect(cursor(sectionOn(page, 'home0001'))).not.toBe('pointer');
    });
});
