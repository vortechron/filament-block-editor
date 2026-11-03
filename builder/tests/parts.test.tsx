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

    it('list the shop info as short rows, and a row opens its group, then Back returns to the part', async () => {
        const adapter = adapterWithSiteInfo();

        mountBuilder({ adapter, parts: PARTS, siteInfo: SITE_INFO });

        const page = await clickHeader();
        const rows = await screen.findByRole('region', { name: 'From shop info' });

        expect(screen.queryByRole('region', { name: 'Shop info' })).toBeNull();
        expect(within(rows).getByRole('button', { name: 'Contact 012-345 6789 · kedai@example.com' })).toBeTruthy();

        fireEvent.click(within(rows).getByRole('button', { name: /Contact/ }));

        expect(await screen.findByRole('region', { name: 'Shop info' })).toBeTruthy();
        expect(page.querySelector('[data-part="header"]')?.hasAttribute('data-builder-picked')).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: 'Back' }));

        expect(await screen.findByText('This part is the same on every page.')).toBeTruthy();
        expect(screen.queryByRole('region', { name: 'Shop info' })).toBeNull();
    });

    it('sum up each group in its row, lists too, and say when a group is not filled yet', async () => {
        const siteInfo: SiteInfo = {
            groups: [
                {
                    key: 'contact',
                    label: 'Hubungi',
                    fields: [
                        {
                            name: 'phones',
                            type: 'list',
                            label: 'Phones',
                            fields: [{ name: 'number', type: 'text', label: 'Number' }],
                        },
                        { name: 'email', type: 'text', label: 'Email' },
                    ],
                },
                {
                    key: 'hours',
                    label: 'Waktu operasi',
                    fields: [
                        {
                            name: 'days',
                            type: 'list',
                            label: 'Days',
                            fields: [
                                { name: 'days', type: 'text', label: 'Days' },
                                { name: 'time', type: 'text', label: 'Time' },
                            ],
                        },
                    ],
                },
                {
                    key: 'social',
                    label: 'Media sosial',
                    fields: [
                        {
                            name: 'links',
                            type: 'list',
                            label: 'Links',
                            fields: [
                                {
                                    name: 'platform',
                                    type: 'select',
                                    label: 'Platform',
                                    options: [
                                        { value: 'facebook', label: 'Facebook' },
                                        { value: 'instagram', label: 'Instagram' },
                                    ],
                                },
                                { name: 'url', type: 'link', label: 'Link' },
                            ],
                        },
                    ],
                },
                { key: 'business', label: 'Perniagaan', fields: [{ name: 'name', type: 'text', label: 'Name' }] },
            ],
            values: {
                contact: {
                    phones: [{ number: '012-345 6789' }, { number: '013-111 2222' }, { number: '' }],
                    email: 'kedai@example.com',
                },
                hours: { days: [{ days: 'Isnin - Jumaat', time: '9 pagi' }, { days: 'Sabtu', time: '' }] },
                social: { links: [{ platform: 'facebook', url: 'https://fb.com/kedai' }, { platform: 'instagram', url: '' }] },
                business: { name: '  ' },
            },
        };

        mountBuilder({ adapter: adapterWithSiteInfo(), parts: PARTS, siteInfo });
        await clickHeader();

        const rows = await screen.findByRole('region', { name: 'From shop info' });

        expect(within(rows).getAllByRole('button').map((row) => row.textContent)).toEqual([
            'Hubungi012-345 6789 / 013-111 2222 · kedai@example.com',
            'Waktu operasiIsnin - Jumaat / Sabtu',
            'Media sosialFacebook / Instagram',
            'Perniagaannot filled yet',
        ]);
    });

    it('save the shop info through saveSiteInfo, then draw the page again', async () => {
        const adapter = adapterWithSiteInfo();

        mountBuilder({ adapter, parts: PARTS, siteInfo: SITE_INFO });
        await clickHeader();
        fireEvent.click(within(await screen.findByRole('region', { name: 'From shop info' })).getByRole('button'));

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
        fireEvent.click(within(await screen.findByRole('region', { name: 'From shop info' })).getByRole('button'));

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
