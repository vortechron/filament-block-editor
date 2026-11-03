import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PageValueInput } from '../src/types';
import { mountBuilder, pickSection } from './mount-helpers';

const PAGE: PageValueInput = {
    version: 2,
    sections: [
        {
            id: 'hero0001',
            type: 'rich',
            data: { layout: 'hero', document: [{ type: 'heading', content: 'Selamat datang' }] },
        },
        {
            id: 'text0001',
            type: 'rich',
            data: { layout: 'plain', document: [{ type: 'paragraph', content: 'Buka setiap hari' }] },
        },
    ],
};

/** As the host sends it: the section's data is filled in by the builder. */
const SYNCED = [
    {
        id: 12,
        title: 'Footer CTA',
        editUrl: '/admin/sections/12/build',
        section: {
            id: 'orig0001',
            type: 'rich' as const,
            data: {
                layout: 'banner' as const,
                document: [{ id: 'jom00001', type: 'heading', props: { level: 2 }, content: 'Jom singgah' }],
            },
        },
    },
];

/** The Sections tab of the Add panel, with the picked section kept. */
function openAddSections() {
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Sections' }));
}

function syncedGroup(): HTMLElement | null {
    return screen.queryByText('Synced sections')?.closest('section') ?? null;
}

describe('adding a synced section from the Add panel', () => {
    it('adds a ref to it after the picked section, and opens it', async () => {
        const { builder } = mountBuilder({ value: PAGE, syncedSections: SYNCED as never });

        await pickSection(/Selamat datang/);
        openAddSections();
        fireEvent.click(within(syncedGroup() as HTMLElement).getByRole('button', { name: /Footer CTA/ }));

        const sections = builder.getValue().sections;

        expect(sections.map((section) => section.id)).toEqual(['hero0001', sections[1].id, 'text0001']);
        expect(sections[1]).toEqual({ id: sections[1].id, type: 'ref', ref: 12 });
        expect(['hero0001', 'text0001', 'orig0001']).not.toContain(sections[1].id);
        expect(await screen.findByRole('link', { name: 'Edit synced section' })).toBeTruthy();
    });
});

describe('the Synced sections group in the Add panel', () => {
    it('is not shown when the host has no synced sections', () => {
        mountBuilder({ value: PAGE });

        expect(screen.getByRole('tab', { name: 'Sections' }).getAttribute('aria-selected')).toBe('true');
        expect(screen.getByRole('button', { name: /^FAQ/ })).toBeTruthy();
        expect(syncedGroup()).toBeNull();
    });

    it('is not offered in the builder of a synced section itself', () => {
        mountBuilder({ value: PAGE, syncedSections: SYNCED as never, kind: 'section' });

        expect(screen.getByRole('button', { name: /^FAQ/ })).toBeTruthy();
        expect(syncedGroup()).toBeNull();
    });

    it('follows the search box', () => {
        mountBuilder({ value: PAGE, syncedSections: SYNCED as never });

        const search = screen.getByRole('searchbox');

        fireEvent.change(search, { target: { value: 'footer' } });
        expect(within(syncedGroup() as HTMLElement).getByRole('button', { name: /Footer CTA/ })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /^FAQ/ })).toBeNull();

        fireEvent.change(search, { target: { value: 'faq' } });
        expect(syncedGroup()).toBeNull();
    });
});
