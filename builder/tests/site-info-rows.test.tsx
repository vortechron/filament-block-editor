import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
    DynamicValueDefinition,
    OwnBlockDefinition,
    PageValueInput,
    SiteInfo,
} from '../src/types';
import { makeAdapter, mountBuilder, pickSection } from './mount-helpers';

const SITE_INFO: SiteInfo = {
    groups: [
        { key: 'business', label: 'Business', fields: [{ name: 'name', type: 'text', label: 'Shop name' }] },
        {
            key: 'contact',
            label: 'Hubungi',
            fields: [
                { name: 'phone', type: 'text', label: 'Shop phone' },
                { name: 'email', type: 'text', label: 'Shop email' },
            ],
        },
        { key: 'hours', label: 'Opening hours', fields: [{ name: 'days', type: 'text', label: 'Days open' }] },
    ],
    values: {
        business: { name: 'Kedai Buku' },
        contact: { phone: '012-345 6789', email: 'kedai@example.com' },
        hours: { days: 'Isnin - Jumaat' },
    },
};

const OWN_BLOCKS: OwnBlockDefinition[] = [
    {
        kind: 'opening-hours',
        label: 'Opening hours board',
        fields: [{ name: 'heading', type: 'text', label: 'Heading' }],
        siteInfo: ['hours'],
    },
    {
        kind: 'contact-card',
        label: 'Contact card',
        fields: [{ name: 'note', type: 'text', label: 'Note' }],
        showsValues: ['site.phone', 'site.email'],
    },
];

const DYNAMIC_VALUES: DynamicValueDefinition[] = [
    { key: 'site.phone', label: 'Phone', type: 'text', preview: '012-345 6789', settings: 'contact' },
    { key: 'site.email', label: 'Email', type: 'text', preview: null, settings: 'contact' },
];

function page(document: Record<string, unknown>[]): PageValueInput {
    return {
        version: 2,
        sections: [{ id: 'sect0001', type: 'rich', data: { layout: 'plain', document } }],
    };
}

const HEADING = { id: 'head0001', type: 'heading', props: { level: 2 }, content: 'Waktu buka' };

function siteInfoAdapter() {
    return { ...makeAdapter(), saveSiteInfo: vi.fn(async () => ({ ok: true as const })) };
}

function mountWithShopInfo(document: Record<string, unknown>[], adapter = siteInfoAdapter()) {
    return mountBuilder({
        value: page(document),
        adapter,
        siteInfo: SITE_INFO,
        blocks: OWN_BLOCKS,
        dynamicValues: DYNAMIC_VALUES,
    });
}

/** The group names a shop info form shows. */
function groupNames(card: HTMLElement): string[] {
    return SITE_INFO.groups
        .map((group) => group.label)
        .filter((label) => within(card).queryByText(label, { selector: 'p' }) !== null);
}

/** Each row of a "From shop info" block: its label and the value it shows. */
function rowsOf(block: HTMLElement): string[][] {
    return within(block)
        .getAllByRole('button')
        .map((row) =>
            [...row.querySelectorAll('[data-row-label], [data-row-value]')].map((part) => part.textContent ?? ''),
        );
}

const CONTACT_CARD = { id: 'own00002', type: 'ownBlock', props: { kind: 'contact-card', values: '{}' } };

describe('the shop info of a picked item', () => {
    it('is a short row per shop value it shows, with what it is now, not the form', async () => {
        mountWithShopInfo([HEADING, CONTACT_CARD]);

        await pickSection(/Waktu buka/);
        // A section shows no shop info of its own.
        expect(screen.queryByRole('region', { name: 'From shop info' })).toBeNull();
        expect(screen.queryByRole('region', { name: 'Shop info' })).toBeNull();

        fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

        const block = await screen.findByRole('region', { name: 'From shop info' });

        expect(within(block).getByText('Tap to change. Changes on every page.')).toBeTruthy();
        expect(rowsOf(block)).toEqual([
            ['Phone', '012-345 6789'],
            ['Email', 'not filled yet'],
        ]);
        expect(screen.queryByRole('region', { name: 'Shop info' })).toBeNull();
        expect(screen.queryByLabelText('Shop phone')).toBeNull();
    });

    it('is one row for a whole group when the block only names the group', async () => {
        mountWithShopInfo([HEADING, { id: 'own00001', type: 'ownBlock', props: { kind: 'opening-hours', values: '{}' } }]);

        await pickSection(/Waktu buka/);
        fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

        expect(rowsOf(await screen.findByRole('region', { name: 'From shop info' }))).toEqual([
            ['Opening hours', 'Isnin - Jumaat'],
        ]);
    });

    it('opens only the row’s group when tapped, and Back returns to the same item', async () => {
        const adapter = siteInfoAdapter();

        mountWithShopInfo([HEADING, CONTACT_CARD], adapter);
        await pickSection(/Waktu buka/);
        fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
        fireEvent.click(within(await screen.findByRole('region', { name: 'From shop info' })).getByRole('button', { name: /Email/ }));

        const form = await screen.findByRole('region', { name: 'Shop info' });
        const trail = within(screen.getByRole('navigation', { name: 'Where you are' }));

        expect(groupNames(form)).toEqual(['Hubungi']);
        expect(trail.getByRole('button', { name: 'Contact card' })).toBeTruthy();
        expect(screen.queryByRole('region', { name: 'From shop info' })).toBeNull();

        fireEvent.change(within(form).getByLabelText('Shop email'), { target: { value: 'baru@kedai.my' } });
        await act(async () => {
            fireEvent.click(within(form).getByRole('button', { name: 'Save shop info' }));
        });
        expect(adapter.saveSiteInfo).toHaveBeenCalledWith({
            ...SITE_INFO.values,
            contact: { phone: '012-345 6789', email: 'baru@kedai.my' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Back' }));

        expect(screen.queryByRole('region', { name: 'Shop info' })).toBeNull();
        expect(await screen.findByRole('region', { name: 'From shop info' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Edit in the section' })).toBeTruthy();
        expect(within(screen.getByRole('navigation', { name: 'Where you are' })).getByRole('button', { name: /Waktu buka/ })).toBeTruthy();
    });
});

describe('the shop values after the shop info is saved', () => {
    it('show what the host read again, in the rows and in the chips', async () => {
        const adapter = {
            ...makeAdapter(),
            saveSiteInfo: vi.fn(async () => ({
                ok: true as const,
                dynamicValues: [DYNAMIC_VALUES[0], { ...DYNAMIC_VALUES[1], preview: 'baru@kedai.my' }],
            })),
        };
        const chip = { id: 'para0001', type: 'paragraph', content: [{ type: 'dynamic', props: { key: 'site.email' } }] };

        mountWithShopInfo([HEADING, chip, CONTACT_CARD], adapter);
        await pickSection(/Waktu buka/);
        await waitFor(() => expect(document.querySelector('[data-dynamic="site.email"]')).not.toBeNull());
        expect(document.querySelector('[data-dynamic="site.email"]')?.textContent).toBe('Email');

        fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
        fireEvent.click(within(await screen.findByRole('region', { name: 'From shop info' })).getByRole('button', { name: /Email/ }));

        const form = await screen.findByRole('region', { name: 'Shop info' });

        fireEvent.change(within(form).getByLabelText('Shop email'), { target: { value: 'baru@kedai.my' } });
        await act(async () => {
            fireEvent.click(within(form).getByRole('button', { name: 'Save shop info' }));
        });
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));

        expect(rowsOf(await screen.findByRole('region', { name: 'From shop info' }))).toEqual([
            ['Phone', '012-345 6789'],
            ['Email', 'baru@kedai.my'],
        ]);
        expect(document.querySelector('[data-dynamic="site.email"]')?.textContent).toBe('Email· baru@kedai.my');
    });
});

describe('the shop info of a form', () => {
    it('is a row with the actions while one goes to the shop email', async () => {
        const form = {
            name: 'Borang',
            fields: [],
            submit: { text: 'Hantar', align: 'left' },
            success: '',
            actions: [{ type: 'email', to: '@site.email', subject: '' }],
        };

        mountWithShopInfo([HEADING, { id: 'form0001', type: 'form', props: { form: JSON.stringify(form) } }]);
        await pickSection(/Waktu buka/);
        fireEvent.click(await screen.findByRole('button', { name: 'Edit form' }));

        const actions = screen.getByRole('heading', { name: 'After sending' }).closest('section') as HTMLElement;
        const rows = within(actions).getByRole('region', { name: 'From shop info' });

        expect(rowsOf(rows)).toEqual([['Email', 'not filled yet']]);
        expect(screen.getAllByRole('region', { name: 'From shop info' })).toHaveLength(1);

        // Sent to another address, the form no longer uses the shop's.
        fireEvent.click(within(actions).getByRole('radio', { name: 'Another email' }));
        fireEvent.change(within(actions).getByLabelText('Email address'), { target: { value: 'saya@kedai.my' } });

        await waitFor(() => expect(screen.queryByRole('region', { name: 'From shop info' })).toBeNull());
    });
});

describe('the Shop info button in the top bar', () => {
    it('opens the whole shop info form in the sidebar, like the design panel', async () => {
        mountWithShopInfo([HEADING]);

        fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Shop info' }));

        const form = await screen.findByRole('region', { name: 'Shop info' });

        expect(groupNames(form)).toEqual(['Business', 'Hubungi', 'Opening hours']);
        expect(within(form).getByText('Shared')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Back' }));

        expect(screen.queryByRole('region', { name: 'Shop info' })).toBeNull();
    });
});

describe('the canvas while the shop info is typed', () => {
    it('is drawn again with the unsaved shop info, and nothing is saved', async () => {
        const adapter = siteInfoAdapter();

        mountWithShopInfo([HEADING], adapter);
        fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Shop info' }));

        const form = await screen.findByRole('region', { name: 'Shop info' });

        fireEvent.change(within(form).getByLabelText('Shop phone'), { target: { value: '013-000 1111' } });

        await waitFor(
            () =>
                expect(adapter.preview.mock.calls.at(-1)?.[1]?.siteInfo?.contact).toEqual({
                    phone: '013-000 1111',
                    email: 'kedai@example.com',
                }),
            { timeout: 2000 },
        );
        expect(adapter.saveSiteInfo).not.toHaveBeenCalled();
    });
});

describe('without a shop info form', () => {
    it.each([
        ['the host sends no shop info', { siteInfo: null, adapter: siteInfoAdapter() }],
        ['the host can not save it', { siteInfo: SITE_INFO, adapter: makeAdapter() }],
    ])('shows no rows, no top bar button and sends no shop info to the preview when %s', async (_, options) => {
        const { adapter } = mountBuilder({
            ...options,
            value: page([
                HEADING,
                { id: 'para0001', type: 'paragraph', content: [{ type: 'dynamic', props: { key: 'site.phone' } }] },
                { id: 'own00001', type: 'ownBlock', props: { kind: 'opening-hours', values: '{}' } },
            ]),
            blocks: OWN_BLOCKS,
            dynamicValues: DYNAMIC_VALUES,
        });

        expect(within(screen.getByRole('banner')).queryByRole('button', { name: 'Shop info' })).toBeNull();

        await pickSection(/Waktu buka/);
        fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
        expect(await screen.findByRole('button', { name: 'Edit in the section' })).toBeTruthy();
        expect(screen.queryByRole('region', { name: 'From shop info' })).toBeNull();
        expect(screen.queryByRole('region', { name: 'Shop info' })).toBeNull();

        await waitFor(() => expect(adapter.preview).toHaveBeenCalled());
        expect(adapter.preview.mock.calls.every(([, extra]) => extra?.siteInfo === undefined)).toBe(true);
    });
});
