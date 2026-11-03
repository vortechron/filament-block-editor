import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PageValueInput } from '../src/types';
import { mountBuilder } from './mount-helpers';

const OWN_ONLY: PageValueInput = {
    version: 2,
    sections: [
        {
            id: 'own00001',
            type: 'rich',
            data: {
                layout: 'plain',
                document: [{ type: 'ownBlock', props: { kind: 'stationery-board', values: '{}' } }],
            },
        },
    ],
};

const BLOCKS = [{ kind: 'stationery-board', label: 'Stationery board', fields: [] }];

describe('the name of a section with no words', () => {
    it('is its own block’s label, in the Structure list and the breadcrumb', () => {
        mountBuilder({ value: OWN_ONLY, blocks: BLOCKS });

        fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
        fireEvent.click(screen.getByRole('button', { name: /Stationery board/ }));

        const crumbs = screen.getByRole('navigation', { name: 'Where you are' }).parentElement as HTMLElement;

        expect(within(crumbs).getByText('1. Stationery board')).toBeTruthy();
        expect(screen.queryByText(/Empty section/)).toBeNull();
    });
});
