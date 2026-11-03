import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SaveResult, SiteInfo } from '../src/types';
import { loadCanvasPage, pageHtml } from './frame-helpers';
import { makeAdapter, mountBuilder } from './mount-helpers';

const HERO_HTML = '<div data-block-id="hero0001"><section><h1 data-item="0">Selamat datang</h1></section></div>';

const PARTS = [
    { key: 'header' as const, title: 'Header kedai', editUrl: '/admin/parts/header/build' },
    { key: 'footer' as const, title: 'Footer kedai', editUrl: '/admin/parts/footer/build' },
];

const SITE_INFO: SiteInfo = {
    groups: [
        {
            key: 'contact',
            label: 'Contact',
            fields: [
                { name: 'phone', type: 'text', label: 'Shop phone' },
                { name: 'email', type: 'text', label: 'Shop email' },
            ],
        },
    ],
    values: { contact: { phone: '012-345 6789', email: 'kedai@example.com' } },
};

function adapterWithSiteInfo(save: () => Promise<SaveResult> = async () => ({ ok: true })) {
    const adapter = { ...makeAdapter(), saveSiteInfo: vi.fn(save) };

    adapter.preview.mockImplementation(async () => pageHtml(HERO_HTML));

    return adapter;
}

async function clickHeader() {
    const page = await loadCanvasPage();

    fireEvent.click(page.querySelector('[data-part="header"] a') as Element);

    return page;
}

describe('the header and footer on the canvas', () => {
    it('open the part panel when tapped, with its title and a link to edit it', async () => {
        const adapter = adapterWithSiteInfo();

        mountBuilder({ adapter, parts: PARTS });

        const page = await clickHeader();

        expect(await screen.findByText('Header kedai')).toBeTruthy();
        expect(screen.getByText('This part is the same on every page.')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Edit header' }).getAttribute('href')).toBe(
            '/admin/parts/header/build',
        );
        // The page marks the picked part, like a picked section.
        expect(page.querySelector('[data-part="header"]')?.hasAttribute('data-builder-picked')).toBe(true);
    });

    it('save the shop info through saveSiteInfo, then draw the page again', async () => {
        const adapter = adapterWithSiteInfo();

        mountBuilder({ adapter, parts: PARTS, siteInfo: SITE_INFO });
        await clickHeader();

        const form = await screen.findByRole('region', { name: 'Shop info' });

        expect(within(form).getByText('Changes on every page')).toBeTruthy();

        fireEvent.change(within(form).getByLabelText('Shop phone'), {
            target: { value: '013-000 1111' },
        });

        const previewsBefore = adapter.preview.mock.calls.length;

        await act(async () => {
            fireEvent.click(within(form).getByRole('button', { name: 'Save shop info' }));
        });

        expect(adapter.saveSiteInfo).toHaveBeenCalledWith({
            contact: { phone: '013-000 1111', email: 'kedai@example.com' },
        });
        await waitFor(() => expect(adapter.preview.mock.calls.length).toBeGreaterThan(previewsBefore));
    });

    it('show what the host refused when the shop info is not saved', async () => {
        const adapter = adapterWithSiteInfo(async () => ({
            ok: false,
            errors: { 'contact.phone': 'That phone number is not valid.' },
        }));

        mountBuilder({ adapter, parts: PARTS, siteInfo: SITE_INFO });
        await clickHeader();

        const form = await screen.findByRole('region', { name: 'Shop info' });

        fireEvent.change(within(form).getByLabelText('Shop phone'), { target: { value: 'abc' } });
        await act(async () => {
            fireEvent.click(within(form).getByRole('button', { name: 'Save shop info' }));
        });

        expect(await screen.findByText('Your shop info was not saved')).toBeTruthy();
        expect(screen.getByText('That phone number is not valid.')).toBeTruthy();
    });
});

describe('a hidden section on the canvas', () => {
    it('is dimmed with a Hidden badge, and can still be picked', async () => {
        const adapter = makeAdapter();

        adapter.preview.mockImplementation(async () =>
            pageHtml(HERO_HTML.replace('data-block-id="hero0001"', 'data-block-id="hero0001" data-hidden')),
        );
        mountBuilder({ adapter });

        const page = await loadCanvasPage();
        const section = page.querySelector('[data-block-id="hero0001"]') as HTMLElement;
        const badge = section.querySelector('[data-builder-hidden-badge]');

        expect(badge?.textContent).toBe('Hidden');

        fireEvent.click(section.querySelector('h1') as Element);

        expect(await screen.findByText('Words in this section')).toBeTruthy();
    });
});

describe('the top bar', () => {
    it('says when the builder edits the footer', () => {
        mountBuilder({ kind: 'footer', title: 'Kedai Buku' });

        const bar = screen.getByRole('banner');

        expect(within(bar).getByText('Footer')).toBeTruthy();
        expect(within(bar).getByText('Kedai Buku')).toBeTruthy();
    });
});
