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
