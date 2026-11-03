import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PageValueInput } from '../src/types';
import { mountBuilder } from './mount-helpers';

const text = (value: string) => [{ type: 'text', text: value, styles: {} }];

const PAGE: PageValueInput = {
    version: 2,
    sections: [
        {
            id: 'hero0001',
            type: 'rich',
            data: {
                layout: 'hero',
                document: [
                    { id: 'head0001', type: 'heading', props: { level: 1 }, content: text('Selamat datang'), children: [] },
                    { id: 'btn00001', type: 'button', props: { text: 'Hubungi kami', url: '', variant: 'solid' }, content: undefined, children: [] },
                ],
            },
        },
        {
            id: 'cols0001',
            type: 'rich',
            data: {
                layout: 'plain',
                document: [
                    {
                        id: 'list0001',
                        type: 'columnList',
                        props: {},
                        children: [
                            { id: 'col00001', type: 'column', props: {}, children: [{ id: 'photo001', type: 'image', props: {}, children: [] }] },
                            { id: 'col00002', type: 'column', props: {}, children: [{ id: 'para0001', type: 'paragraph', props: {}, content: text('Kanan'), children: [] }] },
                        ],
                    },
                ],
            },
        },
        { id: 'k9x8', type: 'ref', ref: 12 },
    ],
};

const PARTS = [
    { key: 'header' as const, title: 'Header kedai', editUrl: '/admin/parts/header/build' },
    { key: 'footer' as const, title: 'Footer kedai', editUrl: '/admin/parts/footer/build' },
];

function openStructure() {
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));

    return within(screen.getByRole('list'));
}

describe('the Structure tree', () => {
    it('starts with every section closed and shows no chevron on a synced section', () => {
        mountBuilder({ value: PAGE });
        const rows = openStructure();

        expect(rows.getAllByRole('button', { expanded: false })).toHaveLength(2);
        expect(screen.queryByRole('button', { name: /Hubungi/ })).toBeNull();
    });

    it('opens a section with its chevron and lists its items', () => {
        mountBuilder({ value: PAGE });
        const rows = openStructure();

        fireEvent.click(rows.getByRole('button', { name: 'Show items of section 1' }));

        expect(rows.getByRole('button', { name: /^Heading.*Selamat datang/ })).toBeTruthy();
        expect(rows.getByRole('button', { name: /^Button/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Hide items of section 1', expanded: true })).toBeTruthy();
    });

    it('lists the items of words saved without block ids, as a page made by a migration is', () => {
        mountBuilder({
            value: {
                version: 2,
                sections: [
                    {
                        id: 'noids001',
                        type: 'rich',
                        data: {
                            layout: 'plain',
                            document: [
                                { type: 'heading', props: { level: 2 }, content: text('Tentang kami'), children: [] },
                                { type: 'paragraph', props: {}, content: text('Kedai kecil'), children: [] },
                            ],
                        },
                    },
                ],
            } as unknown as PageValueInput,
        });
        const rows = openStructure();

        fireEvent.click(rows.getByRole('button', { name: 'Show items of section 1' }));

        expect(rows.getByRole('button', { name: /^Heading.*Tentang kami/ })).toBeTruthy();
        expect(rows.getByRole('button', { name: /^Text.*Kedai kecil/ })).toBeTruthy();
    });

    it('shows the items inside columns under the column list', () => {
        mountBuilder({ value: PAGE });
        const rows = openStructure();

        fireEvent.click(rows.getByRole('button', { name: 'Show items of section 2' }));

        expect(rows.getByRole('button', { name: /^2 columns/ })).toBeTruthy();
        expect(rows.getByRole('button', { name: /^Photo/ })).toBeTruthy();
        expect(rows.getByRole('button', { name: /^Text.*Kanan/ })).toBeTruthy();
    });

    it('opens the item settings when an item is tapped, and Back goes to the section', async () => {
        mountBuilder({ value: PAGE });
        const rows = openStructure();

        fireEvent.click(rows.getByRole('button', { name: 'Show items of section 1' }));
        fireEvent.click(rows.getByRole('button', { name: /^Button/ }));

        expect(await screen.findByRole('button', { name: 'Edit in the section' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Back' }));

        await waitFor(() => expect(screen.queryByRole('button', { name: 'Edit in the section' })).toBeNull());
        expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
    }, 20_000);

    it('opens the picked section and marks the picked item when the tab is shown again (a phone)', async () => {
        const matchMedia = window.matchMedia;

        window.matchMedia = ((query: string) => ({ ...matchMedia(query), matches: false })) as typeof matchMedia;

        try {
            mountBuilder({ value: PAGE });
            fireEvent.click(screen.getByRole('button', { name: /Structure/ }));
            fireEvent.click(await screen.findByRole('button', { name: 'Show items of section 1' }));
            fireEvent.click(screen.getByRole('button', { name: /^Button/ }));
            // Tapping an item closes the sheet, like tapping a section.
            expect(screen.queryByRole('dialog')).toBeNull();
            fireEvent.click(screen.getByRole('button', { name: /Structure/ }));

            const rows = within(await screen.findByRole('list'));

            expect(rows.getByRole('button', { name: /^Button/ }).getAttribute('aria-current')).toBe('true');
            expect(rows.getByRole('button', { name: /^Heading/ }).getAttribute('aria-current')).toBeNull();
            // The other sections stay closed.
            expect(rows.queryByRole('button', { name: /^Photo/ })).toBeNull();
        } finally {
            window.matchMedia = matchMedia;
        }
    }, 20_000);

    it('has the header on the first line and the footer on the last, and they open their panels', () => {
        mountBuilder({ value: PAGE, parts: PARTS });
        openStructure();

        const header = screen.getByRole('button', { name: /Header kedai/ });
        const footer = screen.getByRole('button', { name: /Footer kedai/ });

        expect(header.compareDocumentPosition(screen.getByRole('list')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(footer.compareDocumentPosition(screen.getByRole('list')) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();

        fireEvent.click(footer);

        expect(screen.getByText('This part is the same on every page.')).toBeTruthy();
    });

    it('shows no header or footer line when the site has no parts', () => {
        mountBuilder({ value: PAGE });
        openStructure();

        expect(screen.queryByRole('button', { name: /Header|Footer/ })).toBeNull();
    });

    it('still counts the sections', () => {
        mountBuilder({ value: PAGE });
        openStructure();

        expect(screen.getByText(/^3 of \d+ sections$/)).toBeTruthy();
    });
});
