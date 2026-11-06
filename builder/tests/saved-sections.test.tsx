import {
    act,
    fireEvent,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RichSection, SaveSectionResult } from '../src/types';
import { makeAdapter, mountBuilder, pickSection } from './mount-helpers';

function adapterWith(
    answer: (
        section: RichSection,
        meta: { title: string; synced: boolean },
    ) => SaveSectionResult,
) {
    return {
        ...makeAdapter(),
        saveSection: vi.fn(
            async (
                section: RichSection,
                meta: { title: string; synced: boolean },
            ) => answer(section, meta),
        ),
    };
}

/** Radix menus open on a key press in jsdom. */
async function chooseFromSectionMenu(item: string) {
    fireEvent.keyDown(
        screen.getByRole('button', { name: 'More for this section' }),
        {
            key: 'Enter',
        },
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: item }));
}

async function nameAndSave(name: string) {
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText('Name'), {
        target: { value: name },
    });
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
        await chooseFromSectionMenu('Save a copy');
        await nameAndSave('Hero kedai');

        expect(adapter.saveSection).toHaveBeenCalledTimes(1);
        expect(adapter.saveSection.mock.calls[0][0]).toMatchObject({
            id: 'hero0001',
            type: 'rich',
            data: { layout: 'hero' },
        });
        expect(adapter.saveSection.mock.calls[0][1]).toEqual({
            title: 'Hero kedai',
            synced: false,
        });
        // The page itself is not changed.
        expect(builder.getValue().sections[0].type).toBe('rich');

        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        fireEvent.click(await screen.findByRole('tab', { name: 'Add' }));
        fireEvent.click(await screen.findByRole('tab', { name: 'Sections' }));

        const saved = screen
            .getByText('Saved sections')
            .closest('section') as HTMLElement;

        expect(
            within(saved).getByRole('button', { name: /Hero kedai/ }),
        ).toBeTruthy();
    });

    it('as synced replaces it with a ref to the new synced section, under the same id', async () => {
        const adapter = adapterWith(() => ({ ok: true, id: 12 }));
        const { builder } = mountBuilder({ adapter });

        await pickSection(/Selamat datang/);
        await chooseFromSectionMenu('Make synced');
        await nameAndSave('Hero kedai');

        expect(adapter.saveSection.mock.calls[0][1]).toEqual({
            title: 'Hero kedai',
            synced: true,
        });
        expect(builder.getValue().sections).toEqual([
            { id: 'hero0001', type: 'ref', ref: 12 },
        ]);
        expect(await screen.findByText('Synced: Hero kedai')).toBeTruthy();

        // Other pages can use it now, and so can this one, from the Add panel.
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        fireEvent.click(await screen.findByRole('tab', { name: 'Add' }));
        fireEvent.click(await screen.findByRole('tab', { name: 'Sections' }));

        const synced = screen
            .getByText('Synced sections')
            .closest('section') as HTMLElement;

        expect(
            within(synced).getByRole('button', { name: /Hero kedai/ }),
        ).toBeTruthy();
    });

    it('keeps the section and shows what the host refused', async () => {
        const adapter = adapterWith(() => ({
            ok: false,
            errors: { title: 'That name is taken.' },
        }));
        const { builder } = mountBuilder({ adapter });

        await pickSection(/Selamat datang/);
        await chooseFromSectionMenu('Make synced');
        await nameAndSave('Hero kedai');

        await waitFor(() =>
            expect(screen.getByText('That name is taken.')).toBeTruthy(),
        );
        expect(builder.getValue().sections[0].type).toBe('rich');
    });

    it('is not offered when the host cannot save sections', async () => {
        mountBuilder();

        await pickSection(/Selamat datang/);

        expect(
            screen.queryByRole('button', { name: 'More for this section' }),
        ).toBeNull();
    });
});

it('makes the current Malay and English drafts synced, scoped to this section, and restores them with Undo', async () => {
    const adapter = adapterWith(() => ({ ok: true, id: 12 }));
    const { builder } = mountBuilder({
        adapter,
        fieldLanguages: {
            defaultLocale: 'ms',
            locales: [
                { locale: 'ms', label: 'Bahasa Melayu' },
                { locale: 'en', label: 'English' },
            ],
        },
        value: {
            sections: [
                {
                    id: 's',
                    type: 'rich',
                    data: {
                        document: [
                            {
                                id: 'b',
                                type: 'button',
                                props: { text: 'Hubungi', url: '/contact' },
                                children: [],
                            },
                        ],
                    },
                },
            ],
            translations: {
                en: { 'block:unrelated/props/text': 'Other section' },
            },
        },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(
        screen.getByRole('button', { name: 'Show items of section 1' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: /^Button/ }));
    fireEvent.change(
        await screen.findByRole('textbox', { name: 'Button text' }),
        { target: { value: 'Hubungi draf' } },
    );
    fireEvent.change(screen.getByLabelText('Button text language'), {
        target: { value: 'en' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Button text' }), {
        target: { value: 'Contact draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await chooseFromSectionMenu('Make synced');
    await nameAndSave('Contact section');
    expect(
        adapter.saveSection.mock.calls[0][0].data.document[0].props,
    ).toMatchObject({ text: 'Hubungi draf' });
    expect(adapter.saveSection.mock.calls[0][1]).toEqual({
        title: 'Contact section',
        synced: true,
        translations: { en: { 'block:b/props/text': 'Contact draft' } },
    });
    expect(builder.getValue().sections).toEqual([
        { id: 's', type: 'ref', ref: 12 },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(
        (builder.getValue().sections[0] as RichSection).data.document[0].props,
    ).toMatchObject({ text: 'Hubungi draf' });
    expect(builder.getValue().translations!.en['block:b/props/text']).toBe(
        'Contact draft',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Detach' }));
    fireEvent.click(
        within(await screen.findByRole('dialog')).getByRole('button', {
            name: 'Detach',
        }),
    );
    const detached = builder.getValue().sections[0] as RichSection;
    expect(detached.type).toBe('rich');
    expect(detached.data.document[0].props).toMatchObject({
        text: 'Hubungi draf',
    });
    expect(
        builder.getValue().translations!.en[
            `block:${detached.data.document[0].id}/props/text`
        ],
    ).toBe('Contact draft');
});

it('keeps newer Malay and English drafts when a cancelled Make synced request finishes later', async () => {
    let finish!: (result: SaveSectionResult) => void;
    const adapter = {
        ...makeAdapter(),
        saveSection: vi.fn(
            () =>
                new Promise<SaveSectionResult>((resolve) => {
                    finish = resolve;
                }),
        ),
    };
    const { builder } = mountBuilder({
        adapter,
        fieldLanguages: {
            defaultLocale: 'ms',
            locales: [
                { locale: 'ms', label: 'Bahasa Melayu' },
                { locale: 'en', label: 'English' },
            ],
        },
        value: {
            sections: [
                {
                    id: 's',
                    type: 'rich',
                    data: {
                        document: [
                            {
                                id: 'b',
                                type: 'button',
                                props: { text: 'Hubungi', url: '/contact' },
                                children: [],
                            },
                        ],
                    },
                },
            ],
            translations: { en: { 'block:b/props/text': 'Contact' } },
        },
    });
    await pickSection(/Empty section/);
    await chooseFromSectionMenu('Make synced');
    await nameAndSave('Contact shared');
    const cancel = within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancel',
    });
    expect(cancel).toHaveProperty('disabled', false);
    fireEvent.click(cancel);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(
        screen.getByRole('button', { name: 'Show items of section 1' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: /^Button/ }));
    fireEvent.change(
        await screen.findByRole('textbox', { name: 'Button text' }),
        { target: { value: 'Hubungi terbaru' } },
    );
    fireEvent.change(screen.getByLabelText('Button text language'), {
        target: { value: 'en' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Button text' }), {
        target: { value: 'New contact' },
    });
    await act(async () => finish({ ok: true, id: 22 }));
    const section = builder.getValue().sections[0] as RichSection;
    expect(section.type).toBe('rich');
    expect(section.data.document[0].props).toMatchObject({
        text: 'Hubungi terbaru',
    });
    expect(builder.getValue().translations!.en['block:b/props/text']).toBe(
        'New contact',
    );
});

it.each(['live', 'reloaded'] as const)(
    'copies all language drafts from a %s saved template with fresh block identities and one Undo step',
    async (mode) => {
        const section = {
            id: 'source',
            type: 'rich' as const,
            data: {
                document: [
                    {
                        id: 'source-button',
                        type: 'button',
                        props: { text: 'Hubungi', url: '/contact' },
                        children: [],
                    },
                ],
            },
        };
        const translations = { en: { 'block:source-button/props/text': '' } };
        const template = {
            key: 'saved-7',
            label: 'Contact template',
            category: 'saved',
            section,
            translations,
        };
        const adapter = adapterWith(() => ({ ok: true, id: 7, template }));
        const { builder } = mountBuilder({
            adapter,
            templates: mode === 'reloaded' ? [template] : [],
            value: { sections: mode === 'live' ? [section] : [], translations },
            fieldLanguages: {
                defaultLocale: 'ms',
                locales: [
                    { locale: 'ms', label: 'Bahasa Melayu' },
                    { locale: 'en', label: 'English' },
                ],
            },
        });
        if (mode === 'live') {
            await pickSection(/Empty section/);
            await chooseFromSectionMenu('Save a copy');
            await nameAndSave('Contact template');
            expect(adapter.saveSection.mock.calls[0][1]).toMatchObject({
                synced: false,
                translations,
            });
            fireEvent.click(screen.getByRole('button', { name: 'Back' }));
            fireEvent.click(screen.getByRole('tab', { name: 'Add' }));
        }
        fireEvent.click(screen.getByRole('tab', { name: 'Sections' }));
        const before = builder.getValue();
        fireEvent.click(
            screen.getByRole('button', { name: /Contact template/ }),
        );
        const copy = builder.getValue().sections.at(-1) as RichSection;
        expect(copy.id).not.toBe('source');
        expect(copy.data.document[0].id).not.toBe('source-button');
        expect(copy.data.document[0].props).toMatchObject({
            text: 'Hubungi',
            url: '/contact',
        });
        expect(
            builder.getValue().translations!.en[
                `block:${copy.data.document[0].id}/props/text`
            ],
        ).toBe('');
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(builder.getValue()).toEqual(before);
        fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
        expect(
            builder.getValue().translations!.en[
                `block:${copy.data.document[0].id}/props/text`
            ],
        ).toBe('');
    },
);
