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
];

const DYNAMIC_VALUES: DynamicValueDefinition[] = [
    { key: 'site.phone', label: 'Phone', type: 'text', preview: '012-345 6789', settings: 'contact' },
    { key: 'site.email', label: 'Email', type: 'text', preview: 'kedai@example.com', settings: 'contact' },
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

/** The group names a shop info card shows. */
function groupNames(card: HTMLElement): string[] {
    return SITE_INFO.groups
        .map((group) => group.label)
        .filter((label) => within(card).queryByText(label, { selector: 'p' }) !== null);
}

describe('the shop info card of a picked item', () => {
    it('shows only the groups an own block names, shared, and saves them', async () => {
        const adapter = siteInfoAdapter();

        mountWithShopInfo(
            [HEADING, { id: 'own00001', type: 'ownBlock', props: { kind: 'opening-hours', values: '{}' } }],
            adapter,
        );

        await pickSection(/Waktu buka/);
        fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

        const card = await screen.findByRole('region', { name: 'Shop info' });

        expect(groupNames(card)).toEqual(['Opening hours']);
        expect(within(card).getByText('Shared')).toBeTruthy();
        expect(within(card).getByText('Changes on every page')).toBeTruthy();

        fireEvent.change(within(card).getByLabelText('Days open'), { target: { value: 'Setiap hari' } });
        await act(async () => {
            fireEvent.click(within(card).getByRole('button', { name: 'Save shop info' }));
        });

        expect(adapter.saveSiteInfo).toHaveBeenCalledWith({ ...SITE_INFO.values, hours: { days: 'Setiap hari' } });
    });
});

describe('the shop info card of a picked section', () => {
    it('lists every group used anywhere in the section, like Hubungi for a phone chip', async () => {
        mountWithShopInfo([
            HEADING,
            {
                id: 'para0001',
                type: 'paragraph',
                content: [
                    { type: 'text', text: 'Telefon: ', styles: {} },
                    { type: 'dynamic', props: { key: 'site.phone' } },
                ],
            },
            { id: 'own00001', type: 'ownBlock', props: { kind: 'opening-hours', values: '{}' } },
        ]);

        await pickSection(/Waktu buka/);

        const card = await screen.findByRole('region', { name: 'Shop info' });

        expect(groupNames(card)).toEqual(['Hubungi', 'Opening hours']);
    });
});

describe('the shop info card of a form', () => {
    it('sits with the actions while one goes to the shop email, with the contact group only', async () => {
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
        const card = within(actions).getByRole('region', { name: 'Shop info' });

        expect(groupNames(card)).toEqual(['Hubungi']);
        expect(screen.getAllByRole('region', { name: 'Shop info' })).toHaveLength(1);

        // Sent to another address, the form no longer uses the shop's.
        fireEvent.click(within(actions).getByRole('radio', { name: 'Another email' }));
        fireEvent.change(within(actions).getByLabelText('Email address'), { target: { value: 'saya@kedai.my' } });

        await waitFor(() => expect(screen.queryByRole('region', { name: 'Shop info' })).toBeNull());
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

describe('without a shop info form', () => {
    it.each([
        ['the host sends no shop info', { siteInfo: null, adapter: siteInfoAdapter() }],
        ['the host can not save it', { siteInfo: SITE_INFO, adapter: makeAdapter() }],
    ])('shows no card, no top bar button and sends no shop info to the preview when %s', async (_, options) => {
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
        expect(screen.queryByRole('region', { name: 'Shop info' })).toBeNull();

        fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
        expect(screen.queryByRole('region', { name: 'Shop info' })).toBeNull();

        await waitFor(() => expect(adapter.preview).toHaveBeenCalled());
        expect(adapter.preview.mock.calls.every(([, extra]) => extra?.siteInfo === undefined)).toBe(true);
    });
});
