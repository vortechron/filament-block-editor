import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { mountBuilder } from './mount-helpers';

it('keeps separate field drafts through switching, undo and saving without changing links', async () => {
    const { builder, adapter } = mountBuilder({
        contentLocale: 'ms',
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
                                props: {
                                    text: 'Hubungi',
                                    url: '/contact',
                                    variant: 'solid',
                                },
                                children: [],
                            },
                        ],
                    },
                },
            ],
        },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(
        screen.getByRole('button', { name: 'Show items of section 1' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: /^Button/ }));
    const language = await screen.findByLabelText('Button text language');
    fireEvent.change(language, { target: { value: 'en' } });
    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty(
        'disabled',
        true,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Button text' }), {
        target: { value: 'Contact' },
    });
    fireEvent.change(language, { target: { value: 'ms' } });
    expect(screen.getByRole('textbox', { name: 'Button text' })).toHaveProperty(
        'value',
        'Hubungi',
    );
    fireEvent.change(language, { target: { value: 'en' } });
    expect(screen.getByRole('textbox', { name: 'Button text' })).toHaveProperty(
        'value',
        'Contact',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(
        builder.getValue().translations?.en?.['block:b/props/text'],
    ).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(builder.getValue().translations?.en?.['block:b/props/text']).toBe(
        'Contact',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    await waitFor(() => {
        const copy = builder.getValue().sections[0];
        if (copy.type !== 'rich') throw new Error('Expected rich section');
        const copiedButton = copy.data.document.find(
            (block) => block.type === 'button' && block.id !== 'b',
        );
        expect(
            builder.getValue().translations?.en?.[
                `block:${copiedButton?.id}/props/text`
            ],
        ).toBe('Contact');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(adapter.save).toHaveBeenCalled());
    expect(builder.getValue().translations?.en['block:b/props/text']).toBe(
        'Contact',
    );
    expect(JSON.stringify(builder.getValue().sections)).toContain('/contact');
});

it('edits rich Words while keeping bold, link targets and chips', async () => {
    const { builder } = mountBuilder({
        contentLocale: 'ms',
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
                                id: 'p',
                                type: 'paragraph',
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Buka ',
                                        styles: { bold: true },
                                    },
                                    {
                                        type: 'link',
                                        href: '/contact',
                                        content: [
                                            {
                                                type: 'text',
                                                text: 'sini',
                                                styles: {},
                                            },
                                        ],
                                    },
                                    {
                                        type: 'dynamic',
                                        props: { key: 'site.name' },
                                    },
                                ],
                                children: [],
                            },
                        ],
                    },
                },
            ],
        },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(
        screen.getByRole('button', { name: 'Show items of section 1' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /^Text/ }));
    fireEvent.change(await screen.findByLabelText('Words language'), {
        target: { value: 'en' },
    });
    const editor = await waitFor(() => {
        const element = document.querySelector(
            '[data-inline-words] .ProseMirror',
        ) as HTMLElement & {
            editor: { view: import('@tiptap/pm/view').EditorView };
        };
        expect(element?.editor.view).toBeTruthy();
        return element;
    });
    act(() => {
        const view = editor.editor.view;
        let at = -1;
        view.state.doc.descendants((node, pos) => {
            if (node.isText && node.text === 'Buka ') at = pos;
        });
        view.dispatch(view.state.tr.insertText('Open ', at, at + 5));
    });
    await waitFor(() =>
        expect(
            JSON.parse(builder.getValue().translations!.en['block:p/rich'])
                .content[0].text,
        ).toBe('Open '),
    );
    expect(JSON.stringify(builder.getValue().sections)).toContain(
        '"bold":true',
    );
    expect(JSON.stringify(builder.getValue().sections)).toContain('/contact');
    expect(JSON.stringify(builder.getValue().sections)).toContain('site.name');
});

it('keeps repeated custom text with its identity when rows move and hides language for code fields', async () => {
    const { builder } = mountBuilder({
        contentLocale: 'ms',
        fieldLanguages: {
            defaultLocale: 'ms',
            locales: [
                { locale: 'ms', label: 'Bahasa Melayu' },
                { locale: 'en', label: 'English' },
            ],
        },
        blocks: [
            {
                kind: 'offers',
                label: 'Offers',
                fields: [
                    {
                        name: 'items',
                        type: 'list',
                        fields: [
                            { name: 'title', type: 'text', translatable: true },
                            { name: 'code', type: 'text', translatable: false },
                        ],
                    },
                ],
            },
        ],
        value: {
            sections: [
                {
                    id: 's',
                    type: 'rich',
                    data: {
                        document: [
                            {
                                id: 'o',
                                type: 'ownBlock',
                                props: {
                                    kind: 'offers',
                                    values: JSON.stringify({
                                        items: [
                                            {
                                                _id: 'one',
                                                title: 'Satu',
                                                code: 'CODE',
                                            },
                                            {
                                                _id: 'two',
                                                title: 'Dua',
                                                code: 'TWO',
                                            },
                                        ],
                                    }),
                                },
                                children: [],
                            },
                        ],
                    },
                },
            ],
        },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(
        screen.getByRole('button', { name: 'Show items of section 1' }),
    );
    fireEvent.click(screen.getAllByRole('button', { name: /^Offers/ }).at(-1)!);
    const language = (await screen.findAllByLabelText('Title language'))[0];
    fireEvent.change(language, { target: { value: 'en' } });
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Title' })[0], {
        target: { value: 'One' },
    });
    expect(
        builder.getValue().translations?.en[
            'block:o/values/items/row:one/title'
        ],
    ).toBe('One');
    expect(screen.queryByLabelText('Code language')).toBeNull();
    fireEvent.click(
        screen.getAllByRole('button', { name: 'Move down' }).at(-2)!,
    );
    expect(
        builder.getValue().translations?.en[
            'block:o/values/items/row:one/title'
        ],
    ).toBe('One');
});

it('changes preview language without saving or changing a field language', async () => {
    const { builder, adapter } = mountBuilder({
        contentLocale: 'ms',
        fieldLanguages: {
            defaultLocale: 'ms',
            locales: [
                { locale: 'ms', label: 'Bahasa Melayu' },
                { locale: 'en', label: 'English' },
            ],
        },
    });
    const before = builder.getValue();
    fireEvent.change(screen.getByLabelText('Preview language'), {
        target: { value: 'en' },
    });
    await waitFor(() =>
        expect(adapter.preview).toHaveBeenCalledWith(before, {
            contentLocale: 'en',
        }),
    );
    expect(builder.getValue()).toEqual(before);
    expect(adapter.save).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty(
        'disabled',
        true,
    );
});

it('localizes form visitor words while keeping form names and submitted keys shared', async () => {
    const { builder } = mountBuilder({
        contentLocale: 'ms',
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
                                id: 'f',
                                type: 'form',
                                props: {
                                    form: JSON.stringify({
                                        name: 'Inbox',
                                        fields: [
                                            {
                                                id: 'name',
                                                type: 'text',
                                                name: 'nama',
                                                label: 'Nama',
                                                placeholder: 'Nama penuh',
                                            },
                                        ],
                                        submit: {
                                            text: 'Hantar',
                                            align: 'left',
                                        },
                                        success: 'Terima kasih',
                                        actions: [],
                                    }),
                                },
                                children: [],
                            },
                        ],
                    },
                },
            ],
        },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(
        screen.getByRole('button', { name: 'Show items of section 1' }),
    );
    fireEvent.click(screen.getAllByRole('button', { name: /^Form/ }).at(-1)!);
    fireEvent.click(
        await screen.findByRole('button', { name: 'Field 1: Nama' }),
    );
    fireEvent.change(screen.getByLabelText('Label language'), {
        target: { value: 'en' },
    });
    fireEvent.change(screen.getByLabelText('Label of field 1'), {
        target: { value: 'Name' },
    });
    fireEvent.change(screen.getByLabelText('Button text language'), {
        target: { value: 'en' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Button text' }), {
        target: { value: 'Send' },
    });
    expect(builder.getValue().translations?.en).toMatchObject({
        'block:f/field:name/label': 'Name',
        'block:f/form/submit': 'Send',
    });
    expect(JSON.stringify(builder.getValue().sections)).toContain('nama');
    expect(screen.queryByLabelText('Form name language')).toBeNull();
});

it('saves all shop info language drafts and sends them to preview', async () => {
    const { makeAdapter } = await import('./mount-helpers');
    const { vi } = await import('vitest');
    const saveSiteInfo = vi.fn(async () => ({ ok: true as const }));
    const { adapter } = mountBuilder({
        adapter: { ...makeAdapter(), saveSiteInfo },
        contentLocale: 'ms',
        fieldLanguages: {
            defaultLocale: 'ms',
            locales: [
                { locale: 'ms', label: 'Bahasa Melayu' },
                { locale: 'en', label: 'English' },
            ],
        },
        siteInfo: {
            groups: [
                {
                    key: 'brand',
                    label: 'Brand',
                    fields: [
                        {
                            name: 'tagline',
                            type: 'text',
                            label: 'Tagline',
                            translatable: true,
                        },
                        {
                            name: 'phone',
                            type: 'text',
                            label: 'Phone number',
                            translatable: false,
                        },
                    ],
                },
            ],
            values: { brand: { tagline: 'Kedai anda', phone: '0123' } },
            translations: { en: { brand: { tagline: 'Your shop' } } },
        },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Shop info' }));
    fireEvent.change(await screen.findByLabelText('Tagline language'), {
        target: { value: 'en' },
    });
    expect(screen.getByRole('textbox', { name: 'Tagline' })).toHaveProperty(
        'value',
        'Your shop',
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Tagline' }), {
        target: { value: 'Your local shop' },
    });
    expect(screen.queryByLabelText('Phone number language')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save shop info' }));
    await waitFor(() =>
        expect(saveSiteInfo).toHaveBeenCalledWith(
            { brand: { tagline: 'Kedai anda', phone: '0123' } },
            { en: { brand: { tagline: 'Your local shop' } } },
        ),
    );
    await waitFor(() =>
        expect(
            adapter.preview.mock.calls.some((call) =>
                JSON.stringify(call[1]).includes('Your local shop'),
            ),
        ).toBe(true),
    );
});

it('names the per-field language control in the Malay panel language', async () => {
    mountBuilder({
        locale: 'ms',
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
        },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Struktur' }));
    fireEvent.click(
        screen.getByRole('button', { name: 'Tunjukkan item seksyen 1' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: /^Butang/ }));
    expect(
        await screen.findByRole('combobox', { name: 'Bahasa Teks butang' }),
    ).toHaveProperty('value', 'ms');
});

it.each([
    { label: 'Title', path: 'title', other: 'rows/row:one/title' },
    { label: 'Row title', path: 'rows/row:one/title', other: 'title' },
])(
    'clears only the edited automatic $label field and retains that choice through undo, save and reload',
    async ({ label, path, other }) => {
        const fieldLanguages = {
            defaultLocale: 'ms',
            locales: [
                { locale: 'ms', label: 'Bahasa Melayu' },
                { locale: 'en', label: 'English' },
            ],
        };
        const blocks = [
            {
                kind: 'fallback-info',
                label: 'Fallback info',
                fields: [
                    {
                        name: 'title',
                        label: 'Title',
                        type: 'text' as const,
                        translatable: true,
                        emptyFallback: true,
                    },
                    {
                        name: 'description',
                        label: 'Description',
                        type: 'textarea' as const,
                        translatable: true,
                    },
                    {
                        name: 'rows',
                        type: 'list' as const,
                        fields: [
                            {
                                name: 'title',
                                label: 'Row title',
                                type: 'text' as const,
                                translatable: true,
                                emptyFallback: true,
                            },
                        ],
                    },
                ],
            },
        ];
        const first = mountBuilder({
            blocks,
            fieldLanguages,
            value: {
                sections: [
                    {
                        id: 's',
                        type: 'rich',
                        data: {
                            document: [
                                {
                                    id: 'o',
                                    type: 'ownBlock',
                                    props: {
                                        kind: 'fallback-info',
                                        values: '{"title":"","description":"Maklumat","rows":[{"_id":"one","title":""}]}',
                                    },
                                    children: [],
                                },
                            ],
                        },
                    },
                ],
                translations: {
                    en: {
                        'block:o/values/title': '',
                        'block:o/values/title/_empty_fallback': '1',
                        'block:o/values/rows/row:one/title': '',
                        'block:o/values/rows/row:one/title/_empty_fallback':
                            '1',
                    },
                },
            },
        });
        const open = async () => {
            fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
            fireEvent.click(
                screen.getByRole('button', { name: 'Show items of section 1' }),
            );
            fireEvent.click(
                screen
                    .getAllByRole('button', { name: /^Fallback info/ })
                    .at(-1)!,
            );
            await screen.findByLabelText('Title language');
        };
        await open();
        fireEvent.change(screen.getByLabelText('Description language'), {
            target: { value: 'en' },
        });
        fireEvent.change(screen.getByRole('textbox', { name: 'Description' }), {
            target: { value: 'Updated information' },
        });
        expect(
            first.builder.getValue().translations!.en[
                `block:o/values/${path}/_empty_fallback`
            ],
        ).toBe('1');
        fireEvent.change(screen.getByLabelText(`${label} language`), {
            target: { value: 'en' },
        });
        const input = screen.getByRole('textbox', { name: label });
        expect(input).toHaveProperty('value', '');
        fireEvent.change(input, { target: { value: 'Temporary' } });
        fireEvent.change(input, { target: { value: '' } });
        expect(
            first.builder.getValue().translations!.en[`block:o/values/${path}`],
        ).toBe('');
        expect(
            first.builder.getValue().translations!.en[
                `block:o/values/${path}/_empty_fallback`
            ],
        ).toBeUndefined();
        expect(
            first.builder.getValue().translations!.en[
                `block:o/values/${other}/_empty_fallback`
            ],
        ).toBe('1');
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(
            first.builder.getValue().translations!.en[
                `block:o/values/${path}/_empty_fallback`
            ],
        ).toBe('1');
        fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(first.adapter.save).toHaveBeenCalled());
        const saved = first.adapter.save.mock.calls[0][0];
        act(() => first.builder.unmount());
        first.element.remove();
        const second = mountBuilder({ blocks, fieldLanguages, value: saved });
        await open();
        fireEvent.change(screen.getByLabelText(`${label} language`), {
            target: { value: 'en' },
        });
        expect(screen.getByRole('textbox', { name: label })).toHaveProperty(
            'value',
            '',
        );
        expect(
            second.builder.getValue().translations!.en[
                `block:o/values/${path}/_empty_fallback`
            ],
        ).toBeUndefined();
        expect(
            second.builder.getValue().translations!.en[
                `block:o/values/${other}/_empty_fallback`
            ],
        ).toBe('1');
    },
);
