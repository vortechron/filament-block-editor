import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RichSection, SaveSectionResult } from '../src/types';
import { makeAdapter, mountBuilder, pickSection } from './mount-helpers';

function adapterWith(
    answer: (section: RichSection, meta: { title: string; synced: boolean }) => SaveSectionResult,
) {
    return {
        ...makeAdapter(),
        saveSection: vi.fn(async (section: RichSection, meta: { title: string; synced: boolean }) =>
            answer(section, meta),
        ),
    };
}

/** Radix menus open on a key press in jsdom. */
async function chooseFromSectionMenu(item: string) {
    fireEvent.keyDown(screen.getByRole('button', { name: 'More for this section' }), {
        key: 'Enter',
    });
    fireEvent.click(await screen.findByRole('menuitem', { name: item }));
}

async function nameAndSave(name: string) {
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: name } });
    await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    });
}

describe('saving a section', () => {
    it('as a template sends a copy and adds the template to the Add panel at once', async () => {
        const adapter = adapterWith((section, meta) => ({
            ok: true,
            id: 7,
            template: {
                key: 'saved-7',
                label: meta.title,
                category: 'saved',
                section: { data: section.data },
            },
        }));
        const { builder } = mountBuilder({ adapter });

        await pickSection(/Selamat datang/);
        await chooseFromSectionMenu('Save as template');
        await nameAndSave('Hero kedai');

        expect(adapter.saveSection).toHaveBeenCalledTimes(1);
        expect(adapter.saveSection.mock.calls[0][0]).toMatchObject({
            id: 'hero0001',
            type: 'rich',
            data: { layout: 'hero' },
        });
        expect(adapter.saveSection.mock.calls[0][1]).toEqual({ title: 'Hero kedai', synced: false });
        // The page itself is not changed.
        expect(builder.getValue().sections[0].type).toBe('rich');

        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        fireEvent.click(await screen.findByRole('tab', { name: 'Add' }));
        fireEvent.click(await screen.findByRole('tab', { name: 'Sections' }));

        const saved = screen.getByText('Saved sections').closest('section') as HTMLElement;

        expect(within(saved).getByRole('button', { name: /Hero kedai/ })).toBeTruthy();
    });

    it('as synced replaces it with a ref to the new synced section, under the same id', async () => {
        const adapter = adapterWith(() => ({ ok: true, id: 12 }));
        const { builder } = mountBuilder({ adapter });

        await pickSection(/Selamat datang/);
        await chooseFromSectionMenu('Make synced');
        await nameAndSave('Hero kedai');

        expect(adapter.saveSection.mock.calls[0][1]).toEqual({ title: 'Hero kedai', synced: true });
        expect(builder.getValue().sections).toEqual([{ id: 'hero0001', type: 'ref', ref: 12 }]);
        expect(await screen.findByText('Synced: Hero kedai')).toBeTruthy();

        // Other pages can use it now, and so can this one, from the Add panel.
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        fireEvent.click(await screen.findByRole('tab', { name: 'Add' }));
        fireEvent.click(await screen.findByRole('tab', { name: 'Sections' }));

        const synced = screen.getByText('Synced sections').closest('section') as HTMLElement;

        expect(within(synced).getByRole('button', { name: /Hero kedai/ })).toBeTruthy();
    });

    it('keeps the section and shows what the host refused', async () => {
        const adapter = adapterWith(() => ({ ok: false, errors: { title: 'That name is taken.' } }));
        const { builder } = mountBuilder({ adapter });

        await pickSection(/Selamat datang/);
        await chooseFromSectionMenu('Make synced');
        await nameAndSave('Hero kedai');

        await waitFor(() => expect(screen.getByText('That name is taken.')).toBeTruthy());
        expect(builder.getValue().sections[0].type).toBe('rich');
    });

    it('is not offered when the host cannot save sections', async () => {
        mountBuilder();

        await pickSection(/Selamat datang/);

        expect(screen.queryByRole('button', { name: 'More for this section' })).toBeNull();
    });
});
