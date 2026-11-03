import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PageValue, PageValueInput } from '../src/types';
import { mountBuilder } from './mount-helpers';

const PAGE: PageValueInput = {
    version: 2,
    sections: [
        {
            id: 'hero0001',
            type: 'rich',
            data: { layout: 'hero', document: [{ type: 'heading', content: 'Selamat datang' }] },
        },
        { id: 'k9x8', type: 'ref', ref: 12 },
    ],
};

function structureRows() {
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));

    return within(screen.getByRole('list'));
}

describe('a synced (ref) section', () => {
    it('is one Synced row with its ref, and goes to the preview and the save untouched', async () => {
        const { adapter, builder } = mountBuilder({ value: PAGE });
        const rows = structureRows();

        expect(rows.getByRole('button', { name: /Synced\s*2\. #12/ })).toBeTruthy();

        await waitFor(() => expect(adapter.preview).toHaveBeenCalled());
        expect((adapter.preview.mock.calls[0][0] as PageValue).sections[1]).toEqual({
            id: 'k9x8',
            type: 'ref',
            ref: 12,
        });

        fireEvent.click(rows.getByRole('button', { name: 'Hide section 2 from the page' }));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        });

        expect(adapter.save.mock.calls[0][0].sections[1]).toEqual({
            id: 'k9x8',
            type: 'ref',
            ref: 12,
            hidden: true,
        });
        expect(builder.getValue().version).toBe(2);
    });

    it('opens a small panel to move and delete it', () => {
        const { builder } = mountBuilder({ value: PAGE });

        fireEvent.click(structureRows().getByRole('button', { name: /Synced/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Move up' }));

        expect(builder.getValue().sections.map((section) => section.id)).toEqual([
            'k9x8',
            'hero0001',
        ]);

        fireEvent.click(screen.getByRole('button', { name: 'Delete section' }));
        fireEvent.click(
            within(screen.getByRole('dialog')).getByRole('button', {
                name: 'Delete section',
            }),
        );

        expect(builder.getValue().sections.map((section) => section.id)).toEqual([
            'hero0001',
        ]);
    });
});

const SYNCED = [
    {
        id: 12,
        title: 'Footer CTA',
        editUrl: '/admin/sections/12/build',
        section: {
            id: 'orig0001',
            type: 'rich' as const,
            lock: { move: true as const },
            data: {
                layout: 'banner' as const,
                document: [{ type: 'heading', props: { level: 2 }, content: 'Jom singgah' }],
            },
        },
    },
];

describe('a synced section the host knows', () => {
    it('shows its title in the Structure list and its panel, with a link to edit it', () => {
        mountBuilder({ value: PAGE, syncedSections: SYNCED as never });

        const rows = structureRows();

        fireEvent.click(rows.getByRole('button', { name: /Synced: Footer CTA/ }));

        expect(screen.getAllByText('Synced: Footer CTA').length).toBeGreaterThan(0);
        expect(
            screen.getByText('This section is shared. Every page that uses it shows the same words.'),
        ).toBeTruthy();
        expect(
            screen.getByRole('link', { name: 'Edit synced section' }).getAttribute('href'),
        ).toBe('/admin/sections/12/build');
    });

    it('asks first before it leaves to edit, when there are unsaved changes', async () => {
        mountBuilder({ value: PAGE, syncedSections: SYNCED as never });

        const rows = structureRows();

        fireEvent.click(rows.getByRole('button', { name: 'Hide section 1 from the page' }));
        fireEvent.click(rows.getByRole('button', { name: /Synced: Footer CTA/ }));
        fireEvent.click(screen.getByRole('link', { name: 'Edit synced section' }));

        expect(await screen.findByText('Leave without saving?')).toBeTruthy();
    });

    it('detaches into a copy of its section under a new id', async () => {
        const { builder } = mountBuilder({ value: PAGE, syncedSections: SYNCED as never });

        fireEvent.click(structureRows().getByRole('button', { name: /Synced: Footer CTA/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Detach' }));
        fireEvent.click(
            within(await screen.findByRole('dialog')).getByRole('button', { name: 'Detach' }),
        );

        const [, copy] = builder.getValue().sections;

        expect(copy.type).toBe('rich');
        expect(copy.id).not.toBe('k9x8');
        expect(copy.id).not.toBe('orig0001');
        expect(copy.type === 'rich' && copy.data.layout).toBe('banner');
        expect(copy.type === 'rich' && copy.data.document[0]).toMatchObject({ content: 'Jom singgah' });
        // A copy made by someone who is not a developer has no locks.
        expect('lock' in copy).toBe(false);
        // The copy is picked, so its words open.
        expect(await screen.findByText('Words in this section')).toBeTruthy();
    });
});
