import {
    act,
    fireEvent,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { expect, it } from 'vitest';
import { NodeSelection } from '@tiptap/pm/state';
import type { PageValue, PageValueInput, RichSection } from '../src/types';
import { mountBuilder } from './mount-helpers';
import { normalizeValue } from '../src/lib/page-value';

const fieldLanguages = {
    defaultLocale: 'ms',
    locales: [
        { locale: 'ms', label: 'Bahasa Melayu' },
        { locale: 'en', label: 'English' },
    ],
};
const words = (text: string) => [{ type: 'text', text, styles: {} }];
const rich = (text: string) =>
    JSON.stringify({ version: 1, content: words(text) });
const cell = (_id: string, text: string) => ({
    type: 'tableCell',
    _id,
    props: {},
    content: words(text).map((item) => ({ ...item, styles: [] })),
});
const fixture = (): Exclude<PageValueInput, readonly unknown[]> => ({
    version: 2,
    sections: [
        {
            id: 's',
            type: 'rich',
            data: {
                document: [
                    {
                        id: 'table',
                        type: 'table',
                        props: {},
                        children: [],
                        content: {
                            type: 'tableContent',
                            rows: [
                                {
                                    cells: [
                                        cell('a', 'Nama'),
                                        cell('b', 'Harga'),
                                    ],
                                },
                                {
                                    cells: [
                                        cell('c', 'Buku'),
                                        cell('d', 'Lima'),
                                    ],
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
    translations: { en: { 'block:table/rich-cell:a': rich('Name') } },
});

it('creates a new table through Add to this section and gives every cell a durable identity before its first translation/save', async () => {
    const first = mountBuilder({ fieldLanguages });
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(screen.getByRole('button', { name: /Selamat datang/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Table' }));
    const input = await screen.findByRole('textbox', {
        name: 'Row 1, column 1 words',
    });
    fireEvent.change(input, { target: { value: 'Nama' } });
    const document = (first.builder.getValue().sections[0] as RichSection).data
        .document;
    const table = document.find((block) => block.type === 'table')!;
    expect(table).toBeTruthy();
    const stored = JSON.stringify(table.content);
    const ids = [...stored.matchAll(/"_id":"([A-Za-z0-9_-]+)"/g)].map(
        (match) => match[1],
    );
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    fireEvent.change(screen.getByLabelText('Row 1, column 1 words language'), {
        target: { value: 'en' },
    });
    fireEvent.change(
        screen.getByRole('textbox', { name: 'Row 1, column 1 words' }),
        { target: { value: 'Name' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(first.adapter.save).toHaveBeenCalledTimes(1));
    const saved: PageValue = first.adapter.save.mock.calls[0][0];
    expect(
        saved.translations!.en[`block:${table.id}/rich-cell:${ids[0]}`],
    ).toBe(rich('Name'));
    expect(JSON.stringify(saved.sections)).toContain(ids[0]);
    act(() => first.builder.unmount());
    first.element.remove();
    const second = mountBuilder({ fieldLanguages, value: saved });
    await openTable();
    fireEvent.change(screen.getByLabelText('Row 1, column 1 words language'), {
        target: { value: 'en' },
    });
    expect(
        screen.getByRole('textbox', { name: 'Row 1, column 1 words' }),
    ).toHaveProperty('value', 'Name');
    expect(JSON.stringify(second.builder.getValue().sections)).toContain(
        ids[0],
    );
});
const content = (value: PageValue) =>
    (value.sections[0] as RichSection).data.document[0].content;

async function openTable() {
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(
        screen.getByRole('button', { name: 'Show items of section 1' }),
    );
    fireEvent.click(
        screen.getByRole('button', { name: /^(Item|Table)(?:\s|$)/ }),
    );
    return screen.findByRole('textbox', { name: 'Row 1, column 1 words' });
}

it('deletes a newly added table before English words and restores its identities in one undo step', async () => {
    const first = mountBuilder({ fieldLanguages });
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(screen.getByRole('button', { name: /Selamat datang/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Table' }));
    await screen.findByRole('textbox', { name: 'Row 1, column 1 words' });
    const tables = () =>
        (
            first.builder.getValue().sections[0] as RichSection
        ).data.document.filter((block) => block.type === 'table');
    const added = structuredClone(tables()[0]);
    expect(added).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(tables()).toHaveLength(0));
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Undo' })[0]);
    expect(tables()).toEqual([added]);
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(tables()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(first.adapter.save).toHaveBeenCalledTimes(1));
    const saved = first.adapter.save.mock.calls[0][0];
    expect(
        (saved.sections[0] as RichSection).data.document.some(
            (block) => block.type === 'table',
        ),
    ).toBe(false);
    act(() => first.builder.unmount());
    first.element.remove();
    const second = mountBuilder({ fieldLanguages, value: saved });
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(
        screen.getByRole('button', { name: 'Show items of section 1' }),
    );
    expect(screen.queryByRole('button', { name: /^Table$/ })).toBeNull();
    expect(second.builder.getValue().translations).toBeUndefined();
});

it('deletes translated table words on save/reload and restores both language drafts and cell IDs with one Undo', async () => {
    const value = normalizeValue(fixture());
    const section = value.sections[0];
    if (section.type !== 'rich') throw new Error('Expected a rich fixture');
    section.data.document.push({
        id: 'p',
        type: 'paragraph',
        content: words('Selamat'),
        children: [],
    });
    value.translations!.en['block:p/rich'] = rich('Welcome');
    value.translations!.en['block:table/rich-cell:b'] = rich('Price');
    const first = mountBuilder({ fieldLanguages, value });
    fireEvent.change(await openTable(), { target: { value: 'Nama baru' } });
    fireEvent.change(screen.getByLabelText('Row 1, column 1 words language'), {
        target: { value: 'en' },
    });
    fireEvent.change(
        screen.getByRole('textbox', { name: 'Row 1, column 1 words' }),
        { target: { value: 'Full name' } },
    );
    const beforeDelete = structuredClone(first.builder.getValue());
    const tables = () =>
        (
            first.builder.getValue().sections[0] as RichSection
        ).data.document.filter((block) => block.type === 'table');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(tables()).toHaveLength(0));
    expect(first.builder.getValue().translations!.en).toEqual({
        'block:p/rich': rich('Welcome'),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(first.adapter.save).toHaveBeenCalledTimes(1));
    const saved = first.adapter.save.mock.calls[0][0];
    expect(saved.translations!.en).toEqual({ 'block:p/rich': rich('Welcome') });
    fireEvent.click(screen.getAllByRole('button', { name: 'Undo' })[0]);
    expect(tables()).toEqual(
        (beforeDelete.sections[0] as RichSection).data.document.filter(
            (block) => block.type === 'table',
        ),
    );
    expect(first.builder.getValue().translations).toEqual(
        beforeDelete.translations,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(tables()).toHaveLength(0);
    expect(first.builder.getValue().translations!.en).toEqual({
        'block:p/rich': rich('Welcome'),
    });
    act(() => first.builder.unmount());
    first.element.remove();
    const second = mountBuilder({ fieldLanguages, value: saved });
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(
        screen.getByRole('button', { name: 'Show items of section 1' }),
    );
    expect(screen.queryByRole('button', { name: /^Table$/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Text Selamat/ }));
    fireEvent.change(await screen.findByLabelText('Words language'), {
        target: { value: 'en' },
    });
    expect(screen.getByRole('textbox', { name: 'Words' })).toHaveProperty(
        'value',
        'Welcome',
    );
    expect(second.builder.getValue().translations!.en).toEqual({
        'block:p/rich': rich('Welcome'),
    });
});

it('edits identified Malay and English cell Words independently and saves then reloads their identities', async () => {
    const first = mountBuilder({ fieldLanguages, value: fixture() });
    const input = await openTable();
    expect(input).toHaveProperty('value', 'Nama');
    fireEvent.change(input, { target: { value: '' } });
    await waitFor(() =>
        expect(JSON.stringify(content(first.builder.getValue()))).not.toContain(
            'Nama',
        ),
    );
    fireEvent.change(screen.getByLabelText('Row 1, column 1 words language'), {
        target: { value: 'en' },
    });
    expect(
        screen.getByRole('textbox', { name: 'Row 1, column 1 words' }),
    ).toHaveProperty('value', 'Name');
    fireEvent.change(
        screen.getByRole('textbox', { name: 'Row 1, column 1 words' }),
        { target: { value: 'Your name' } },
    );
    // Selecting another cell's missing language shows the base without copying it.
    fireEvent.change(screen.getByLabelText('Row 1, column 2 words language'), {
        target: { value: 'en' },
    });
    expect(
        screen.getByRole('textbox', { name: 'Row 1, column 2 words' }),
    ).toHaveProperty('value', 'Harga');
    expect(
        screen.getByText('No English text yet. Showing Bahasa Melayu.'),
    ).toBeTruthy();
    expect(
        first.builder.getValue().translations!.en['block:table/rich-cell:b'],
    ).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(first.adapter.save).toHaveBeenCalledTimes(1));
    const saved: PageValue = first.adapter.save.mock.calls[0][0];
    expect(content(saved)).toEqual({
        type: 'tableContent',
        rows: [
            { cells: [{ ...cell('a', ''), content: [] }, cell('b', 'Harga')] },
            { cells: [cell('c', 'Buku'), cell('d', 'Lima')] },
        ],
    });
    expect(saved.translations!.en['block:table/rich-cell:a']).toBe(
        rich('Your name'),
    );
    act(() => first.builder.unmount());
    first.element.remove();
    const second = mountBuilder({ fieldLanguages, value: saved });
    await openTable();
    fireEvent.change(screen.getByLabelText('Row 1, column 1 words language'), {
        target: { value: 'en' },
    });
    expect(
        screen.getByRole('textbox', { name: 'Row 1, column 1 words' }),
    ).toHaveProperty('value', 'Your name');
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await waitFor(() => expect(second.adapter.preview).toHaveBeenCalled());
    expect(
        second.adapter.preview.mock.calls.at(-1)![0].translations!.en[
            'block:table/rich-cell:a'
        ],
    ).toBe(rich('Your name'));
});

it('reaches each table cell from section Words and keeps an explicit English blank through undo/redo', async () => {
    const { builder } = mountBuilder({ fieldLanguages, value: fixture() });
    await openTable();
    fireEvent.click(
        screen.getByRole('button', { name: 'Edit in the section' }),
    );
    fireEvent.click(
        await screen.findByRole('button', { name: 'Edit table 1 words' }),
    );
    const language = await screen.findByLabelText(
        'Row 1, column 1 words language',
    );
    fireEvent.change(language, { target: { value: 'en' } });
    fireEvent.change(
        screen.getByRole('textbox', { name: 'Row 1, column 1 words' }),
        { target: { value: '' } },
    );
    expect(builder.getValue().translations!.en['block:table/rich-cell:a']).toBe(
        '{"version":1,"content":[]}',
    );
    expect(JSON.stringify(content(builder.getValue()))).toContain('Nama');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(builder.getValue().translations!.en['block:table/rich-cell:a']).toBe(
        rich('Name'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(builder.getValue().translations!.en['block:table/rich-cell:a']).toBe(
        '{"version":1,"content":[]}',
    );
    await waitFor(() =>
        expect(
            screen.getByRole('textbox', { name: 'Row 1, column 1 words' }),
        ).toBeTruthy(),
    );
    fireEvent.change(screen.getByLabelText('Row 1, column 1 words language'), {
        target: { value: 'en' },
    });
    expect(
        screen.getByRole('textbox', { name: 'Row 1, column 1 words' }),
    ).toHaveProperty('value', '');
    expect(
        screen.queryByText('No English text yet. Showing Bahasa Melayu.'),
    ).toBeNull();
});

it('duplicates an identified table with the exact source cell translations in one undo step', async () => {
    const { builder, adapter } = mountBuilder({
        fieldLanguages,
        value: fixture(),
    });
    await openTable();
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    await waitFor(() =>
        expect(
            (
                builder.getValue().sections[0] as RichSection
            ).data.document.filter((block) => block.type === 'table'),
        ).toHaveLength(2),
    );
    const copy = (
        builder.getValue().sections[0] as RichSection
    ).data.document.find(
        (block) => block.type === 'table' && block.id !== 'table',
    )!;
    expect(copy.content).toEqual(content(builder.getValue()));
    expect(
        builder.getValue().translations!.en[`block:${copy.id}/rich-cell:a`],
    ).toBe(rich('Name'));
    fireEvent.change(
        await screen.findByLabelText('Row 1, column 1 words language'),
        { target: { value: 'en' } },
    );
    expect(
        screen.getByRole('textbox', { name: 'Row 1, column 1 words' }),
    ).toHaveProperty('value', 'Name');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(adapter.save).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(
        (builder.getValue().sections[0] as RichSection).data.document.filter(
            (block) => block.type === 'table',
        ),
    ).toHaveLength(1);
    expect(
        builder.getValue().translations!.en[`block:${copy.id}/rich-cell:a`],
    ).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(
        builder.getValue().translations!.en[`block:${copy.id}/rich-cell:a`],
    ).toBe(rich('Name'));
});

async function sectionView() {
    return waitFor(() => {
        const element = document.querySelector<
            HTMLElement & {
                editor: { view: import('@tiptap/pm/view').EditorView };
            }
        >('[data-section-editor] .ProseMirror');
        expect(element?.editor.view).toBeTruthy();
        return element!.editor.view;
    });
}

it.each([
    {
        name: 'Ctrl+Z / Ctrl+Y',
        undo: { key: 'z', code: 'KeyZ', keyCode: 90, ctrlKey: true },
        redo: { key: 'y', code: 'KeyY', keyCode: 89, ctrlKey: true },
    },
    {
        name: 'Ctrl+Z / Ctrl+Shift+Z',
        undo: { key: 'z', code: 'KeyZ', keyCode: 90, ctrlKey: true },
        redo: {
            key: 'z',
            code: 'KeyZ',
            keyCode: 90,
            ctrlKey: true,
            shiftKey: true,
        },
    },
    {
        name: 'Cmd+Z / Cmd+Shift+Z',
        undo: { key: 'z', code: 'KeyZ', keyCode: 90, metaKey: true },
        redo: {
            key: 'z',
            code: 'KeyZ',
            keyCode: 90,
            metaKey: true,
            shiftKey: true,
        },
    },
])(
    'restores a bilingual table deleted in the main section editor with real keyboard Undo and Redo ($name)',
    async ({ undo, redo }) => {
        const value = normalizeValue(fixture());
        const section = value.sections[0];
        if (section.type !== 'rich') throw new Error('Expected a rich fixture');
        section.data.document.push({
            id: 'p',
            type: 'paragraph',
            content: words('Selamat'),
            children: [],
        });
        value.translations!.en['block:p/rich'] = rich('Welcome');
        const first = mountBuilder({ fieldLanguages, value });
        fireEvent.change(await openTable(), { target: { value: 'Nama baru' } });
        fireEvent.change(
            screen.getByLabelText('Row 1, column 1 words language'),
            { target: { value: 'en' } },
        );
        fireEvent.change(
            screen.getByRole('textbox', { name: 'Row 1, column 1 words' }),
            { target: { value: 'Full name' } },
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Edit in the section' }),
        );
        const view = await sectionView();
        let editor = document.querySelector<HTMLElement>(
            '[data-section-editor] .ProseMirror',
        )!;
        act(() => {
            let paragraphEnd = -1;
            view.state.doc.descendants((node, position) => {
                if (node.isText && node.text === 'Selamat')
                    paragraphEnd = position + node.nodeSize;
            });
            expect(paragraphEnd).toBeGreaterThan(-1);
            view.dispatch(view.state.tr.insertText(' terkini', paragraphEnd));
        });
        const before = structuredClone(first.builder.getValue());
        act(() => {
            let tablePosition = -1;
            view.state.doc.descendants((node, position) => {
                if (
                    node.type.name === 'blockContainer' &&
                    node.attrs.id === 'table'
                )
                    tablePosition = position;
            });
            expect(tablePosition).toBeGreaterThan(-1);
            view.dispatch(
                view.state.tr.setSelection(
                    NodeSelection.create(view.state.doc, tablePosition),
                ),
            );
            editor.focus();
        });
        fireEvent.keyDown(editor, { key: 'Backspace', keyCode: 8 });
        const tables = () =>
            (
                first.builder.getValue().sections[0] as RichSection
            ).data.document.filter((block) => block.type === 'table');
        await waitFor(() => expect(tables()).toHaveLength(0));
        expect(
            first.builder.getValue().translations!.en[
                'block:table/rich-cell:a'
            ],
        ).toBeUndefined();
        act(() => editor.focus());
        fireEvent.keyDown(editor, undo);
        await waitFor(() => expect(tables()).toHaveLength(1));
        expect(tables()[0].content).toEqual(content(before));
        expect(first.builder.getValue().translations).toEqual(
            before.translations,
        );
        expect(
            JSON.stringify(
                (
                    first.builder.getValue().sections[0] as RichSection
                ).data.document.find((block) => block.id === 'p')?.content,
            ),
        ).toContain('Selamat terkini');
        await sectionView();
        editor = document.querySelector<HTMLElement>(
            '[data-section-editor] .ProseMirror',
        )!;
        act(() => editor.focus());
        fireEvent.keyDown(editor, redo);
        await waitFor(() => expect(tables()).toHaveLength(0));
        expect(first.builder.getValue().translations!.en).toEqual({
            'block:p/rich': rich('Welcome'),
        });
        await sectionView();
        editor = document.querySelector<HTMLElement>(
            '[data-section-editor] .ProseMirror',
        )!;
        act(() => editor.focus());
        fireEvent.keyDown(editor, undo);
        await waitFor(() => expect(tables()).toHaveLength(1));
        expect(first.builder.getValue().translations).toEqual(
            before.translations,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() =>
            expect(first.adapter.save).toHaveBeenCalledTimes(1),
        );
        const saved = first.adapter.save.mock.calls[0][0];
        expect(content(saved)).toEqual(content(before));
        expect(saved.translations).toEqual(before.translations);
        act(() => first.builder.unmount());
        first.element.remove();
        const second = mountBuilder({ fieldLanguages, value: saved });
        await openTable();
        fireEvent.change(
            screen.getByLabelText('Row 1, column 1 words language'),
            { target: { value: 'en' } },
        );
        expect(
            screen.getByRole('textbox', { name: 'Row 1, column 1 words' }),
        ).toHaveProperty('value', 'Full name');
        expect(content(second.builder.getValue())).toEqual(content(before));
        expect(second.builder.getValue().translations).toEqual(
            before.translations,
        );
    },
);

it.each(['unilingual table', 'bilingual section without tables'])(
    'keeps native main text typing and keyboard Undo/Redo in a %s',
    async (kind) => {
        const value = kind === 'unilingual table' ? fixture() : undefined;
        if (value) delete value.translations;
        const { builder } = mountBuilder(
            kind === 'unilingual table' ? { value } : { fieldLanguages },
        );
        fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
        fireEvent.click(
            screen.getByRole('button', {
                name:
                    kind === 'unilingual table'
                        ? 'Empty section 1. Plain'
                        : /Selamat datang/,
            }),
        );
        const view = await sectionView();
        const editor = document.querySelector<HTMLElement>(
            '[data-section-editor] .ProseMirror',
        )!;
        const initial = kind === 'unilingual table' ? 'Nama' : 'Selamat datang';
        act(() => {
            let end = -1;
            view.state.doc.descendants((node, position) => {
                if (node.isText && node.text === initial)
                    end = position + node.nodeSize;
            });
            expect(end).toBeGreaterThan(-1);
            view.dispatch(view.state.tr.insertText(' typed', end));
            editor.focus();
        });
        expect(JSON.stringify(builder.getValue().sections)).toContain(
            initial + ' typed',
        );
        fireEvent.keyDown(editor, {
            key: 'z',
            code: 'KeyZ',
            keyCode: 90,
            ctrlKey: true,
        });
        await waitFor(() =>
            expect(JSON.stringify(builder.getValue().sections)).not.toContain(
                ' typed',
            ),
        );
        expect(
            document.querySelector('[data-section-editor] .ProseMirror'),
        ).toBe(editor);
        fireEvent.keyDown(editor, {
            key: 'y',
            code: 'KeyY',
            keyCode: 89,
            ctrlKey: true,
        });
        await waitFor(() =>
            expect(JSON.stringify(builder.getValue().sections)).toContain(
                initial + ' typed',
            ),
        );
        expect(
            document.querySelector('[data-section-editor] .ProseMirror'),
        ).toBe(editor);
        expect(screen.queryByRole('alert')).toBeNull();
    },
);

it('keeps a table cell independent inline editor on native keyboard history', async () => {
    const { builder } = mountBuilder({ fieldLanguages, value: fixture() });
    await openTable();
    const original = content(builder.getValue());
    fireEvent.change(screen.getByLabelText('Row 1, column 1 words language'), {
        target: { value: 'en' },
    });
    const field = screen
        .getByRole('textbox', { name: 'Row 1, column 1 words' })
        .closest<HTMLElement>('[data-field-language]')!;
    fireEvent.click(
        within(field).getByRole('button', { name: 'Format words' }),
    );
    const editor = await waitFor(() => {
        const element = within(field).getByRole('textbox', {
            name: 'Row 1, column 1 words',
        }) as HTMLElement & {
            editor: { view: import('@tiptap/pm/view').EditorView };
        };
        expect(element.editor?.view).toBeTruthy();
        return element;
    });
    const view = editor.editor.view;
    act(() => {
        let end = -1;
        view.state.doc.descendants((node, position) => {
            if (node.isText && node.text === 'Name')
                end = position + node.nodeSize;
        });
        expect(end).toBeGreaterThan(-1);
        view.dispatch(view.state.tr.insertText(' typed', end));
        editor.focus();
    });
    await waitFor(() =>
        expect(
            builder.getValue().translations!.en['block:table/rich-cell:a'],
        ).toBe(rich('Name typed')),
    );
    fireEvent.keyDown(editor, {
        key: 'z',
        code: 'KeyZ',
        keyCode: 90,
        ctrlKey: true,
    });
    await waitFor(() =>
        expect(
            builder.getValue().translations!.en['block:table/rich-cell:a'],
        ).toBe(rich('Name')),
    );
    expect(
        within(field).getByRole('textbox', { name: 'Row 1, column 1 words' }),
    ).toBe(editor);
    fireEvent.keyDown(editor, {
        key: 'y',
        code: 'KeyY',
        keyCode: 89,
        ctrlKey: true,
    });
    await waitFor(() =>
        expect(
            builder.getValue().translations!.en['block:table/rich-cell:a'],
        ).toBe(rich('Name typed')),
    );
    expect(content(builder.getValue())).toEqual(original);
});

it('keeps native unilingual table typing usable without the field-language envelope', async () => {
    const value = fixture();
    delete value.translations;
    const { builder, adapter } = mountBuilder({ value });
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(
        screen.getByRole('button', { name: 'Show items of section 1' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /^Table/ }));
    await screen.findByRole('button', { name: 'Edit in the section' });
    expect(
        screen.queryByLabelText('Row 1, column 1 words language'),
    ).toBeNull();
    fireEvent.click(
        screen.getByRole('button', { name: 'Edit in the section' }),
    );
    const view = await sectionView();
    act(() => {
        let at = -1;
        view.state.doc.descendants((node, position) => {
            if (node.isText && node.text === 'Nama') at = position;
        });
        expect(at).toBeGreaterThan(-1);
        view.dispatch(view.state.tr.insertText('Name', at, at + 4));
    });
    await waitFor(() =>
        expect(JSON.stringify(content(builder.getValue()))).toContain('Name'),
    );
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(adapter.save).toHaveBeenCalledTimes(1));
    expect(JSON.stringify(adapter.save.mock.calls[0][0].sections)).toContain(
        'Name',
    );
});

it.each(['row reorder', 'row deletion', 'column deletion'])(
    'refuses an ambiguous native %s without changing either language or any cell identity',
    async (operation) => {
        const { builder } = mountBuilder({ fieldLanguages, value: fixture() });
        await openTable();
        const before = builder.getValue();
        fireEvent.click(
            screen.getByRole('button', { name: 'Edit in the section' }),
        );
        const view = await sectionView();
        act(() => {
            let transaction = view.state.tr;
            view.state.doc.descendants((node, position) => {
                if (node.type.name !== 'table') return;
                expect(node.childCount).toBe(2);
                const rows = Array.from(
                    { length: node.childCount },
                    (_, index) => node.child(index),
                );
                const edited =
                    operation === 'row reorder'
                        ? [rows[1], rows[0]]
                        : operation === 'row deletion'
                          ? [rows[0]]
                          : rows.map((row) =>
                                row.type.create(row.attrs, [row.child(0)]),
                            );
                transaction = transaction.replaceWith(
                    position,
                    position + node.nodeSize,
                    node.type.create(node.attrs, edited),
                );
            });
            expect(transaction.docChanged).toBe(true);
            view.dispatch(transaction);
        });
        expect(await screen.findByRole('alert')).toHaveProperty(
            'textContent',
            'This table edit was not applied because its cell identities cannot be tracked safely. Rebuild the table translations before changing its structure.',
        );
        expect(content(builder.getValue())).toEqual(content(before));
        expect(builder.getValue().translations).toEqual(before.translations);
    },
);

it.each(['missing', 'duplicate'])(
    'refuses named controls for an existing translated table with %s cell identities',
    async (problem) => {
        const first = fixture();
        first.sections = [
            {
                id: 's',
                type: 'rich',
                data: {
                    document: [
                        {
                            id: 'table',
                            type: 'table',
                            content: {
                                type: 'tableContent',
                                rows: [
                                    {
                                        cells: [
                                            problem === 'missing'
                                                ? {
                                                      type: 'tableCell',
                                                      props: {},
                                                      content: words('Nama'),
                                                  }
                                                : cell('a', 'Nama'),
                                            cell('a', 'Harga'),
                                        ],
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
        ];
        const { builder } = mountBuilder({ fieldLanguages, value: first });
        const before = builder.getValue();
        fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
        fireEvent.click(
            screen.getByRole('button', { name: 'Show items of section 1' }),
        );
        fireEvent.click(screen.getByRole('button', { name: /^Table/ }));
        expect(await screen.findByRole('alert')).toHaveProperty(
            'textContent',
            'This table has missing or duplicate cell IDs. Ask the site owner to repair its identities before editing its translations.',
        );
        expect(
            screen.queryByRole('textbox', { name: 'Row 1, column 1 words' }),
        ).toBeNull();
        expect(builder.getValue()).toEqual(before);
    },
);

it.each([false, true])(
    'respects the content lock for named table fields (developer=%s)',
    async (developer) => {
        const value = normalizeValue(fixture());
        const section = value.sections[0];
        if (section.type !== 'rich') throw new Error('Expected a rich fixture');
        section.lock = { content: true };
        mountBuilder({ fieldLanguages, value, developer });
        fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
        if (!developer) {
            expect(
                screen.queryByRole('button', {
                    name: 'Show items of section 1',
                }),
            ).toBeNull();
            fireEvent.click(
                screen.getByRole('button', { name: 'Empty section 1. Plain' }),
            );
            expect(
                screen.queryByRole('button', { name: 'Edit table 1 words' }),
            ).toBeNull();
            expect(
                screen.queryByRole('textbox', {
                    name: 'Row 1, column 1 words',
                }),
            ).toBeNull();
            return;
        }
        fireEvent.click(
            screen.getByRole('button', { name: 'Show items of section 1' }),
        );
        fireEvent.click(screen.getByRole('button', { name: /^Table/ }));
        expect(
            await screen.findByRole('textbox', {
                name: 'Row 1, column 1 words',
            }),
        ).toHaveProperty('value', 'Nama');
    },
);

it('edits English cell formatting through Format words without changing Malay words, marks, layout or identities', async () => {
    const first = mountBuilder({ fieldLanguages, value: fixture() });
    await openTable();
    const original = content(first.builder.getValue());
    fireEvent.change(screen.getByLabelText('Row 1, column 1 words language'), {
        target: { value: 'en' },
    });
    const field = screen
        .getByRole('textbox', { name: 'Row 1, column 1 words' })
        .closest<HTMLElement>('[data-field-language]')!;
    fireEvent.click(
        within(field).getByRole('button', { name: 'Format words' }),
    );
    const view = await waitFor(() => {
        const element = within(field).getByRole('textbox', {
            name: 'Row 1, column 1 words',
        }) as HTMLElement & {
            editor: { view: import('@tiptap/pm/view').EditorView };
        };
        expect(element.getAttribute('contenteditable')).toBe('true');
        return element.editor.view;
    });
    act(() => {
        let transaction = view.state.tr;
        view.state.doc.descendants((node, position) => {
            if (node.isText)
                transaction = transaction.addMark(
                    position,
                    position + node.nodeSize,
                    view.state.schema.marks.bold.create(),
                );
        });
        view.dispatch(transaction);
    });
    await waitFor(() =>
        expect(
            JSON.parse(
                first.builder.getValue().translations!.en[
                    'block:table/rich-cell:a'
                ],
            ).content,
        ).toEqual([{ type: 'text', text: 'Name', styles: { bold: true } }]),
    );
    expect(content(first.builder.getValue())).toEqual(original);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(first.adapter.save).toHaveBeenCalledTimes(1));
    const saved = first.adapter.save.mock.calls[0][0];
    act(() => first.builder.unmount());
    first.element.remove();
    mountBuilder({ fieldLanguages, value: saved });
    await openTable();
    fireEvent.change(screen.getByLabelText('Row 1, column 1 words language'), {
        target: { value: 'en' },
    });
    await waitFor(() =>
        expect(
            screen
                .getByRole('textbox', { name: 'Row 1, column 1 words' })
                .querySelector('strong')?.textContent,
        ).toBe('Name'),
    );
    expect(content(saved)).toEqual(original);
});
