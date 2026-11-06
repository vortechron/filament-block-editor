import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { PageValue, RichSection } from '../src/types';
import { mountBuilder } from './mount-helpers';

const fieldLanguages = {
    defaultLocale: 'ms',
    locales: [
        { locale: 'ms', label: 'Bahasa Melayu' },
        { locale: 'en', label: 'English' },
    ],
};
const words = (text: string) => [{ type: 'text', text, styles: {} }];
const rich = (content: unknown[]) => JSON.stringify({ version: 1, content });

async function openText() {
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(
        screen.getByRole('button', { name: 'Show items of section 1' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /^Text/ }));
    return screen.findByRole('textbox', { name: 'Words' });
}

it('clears Malay and saves then reloads the independent English Words field', async () => {
    const first = mountBuilder({
        fieldLanguages,
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
                                content: words('Selamat'),
                                children: [],
                            },
                        ],
                    },
                },
            ],
            translations: { en: { 'block:p/rich': rich(words('Welcome')) } },
        },
    });
    const input = await openText();
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Words language'), {
        target: { value: 'en' },
    });
    expect(screen.getByRole('textbox', { name: 'Words' })).toHaveProperty(
        'value',
        'Welcome',
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Words' }), {
        target: { value: 'Welcome here' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(first.adapter.save).toHaveBeenCalled());
    const saved: PageValue = first.adapter.save.mock.calls[0][0];
    expect((saved.sections[0] as RichSection).data.document[0].content).toEqual(
        [],
    );
    expect(JSON.parse(saved.translations!.en['block:p/rich']).content).toEqual(
        words('Welcome here'),
    );
    act(() => first.builder.unmount());
    first.element.remove();
    mountBuilder({ fieldLanguages, value: saved });
    await openText();
    fireEvent.change(screen.getByLabelText('Words language'), {
        target: { value: 'en' },
    });
    expect(screen.getByRole('textbox', { name: 'Words' })).toHaveProperty(
        'value',
        'Welcome here',
    );
});

it('keeps English through a real base format merge, edits English formatting, and undoes then reloads safely', async () => {
    const ms = [
        { type: 'text', text: 'Buka ', styles: { bold: true } },
        ...words('hari ini'),
    ];
    const en = [
        { type: 'text', text: 'Open ', styles: { bold: true } },
        ...words('today'),
    ];
    const { builder, adapter } = mountBuilder({
        fieldLanguages,
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
                                content: ms,
                                children: [],
                            },
                        ],
                    },
                },
            ],
            translations: { en: { 'block:p/rich': rich(en) } },
        },
    });
    await openText();
    type EditorElement = HTMLElement & {
        editor: { view: import('@tiptap/pm/view').EditorView };
    };
    const section = await waitFor(() => {
        const element = document.querySelector<EditorElement>(
            '[data-section-editor] .ProseMirror',
        );
        expect(element?.editor.view).toBeTruthy();
        return element!;
    });
    act(() => {
        const view = section.editor.view;
        view.dispatch(
            view.state.tr.removeMark(
                0,
                view.state.doc.content.size,
                view.state.schema.marks.bold,
            ),
        );
    });
    await waitFor(() =>
        expect(
            (builder.getValue().sections[0] as RichSection).data.document[0]
                .content,
        ).toEqual(words('Buka hari ini')),
    );
    expect(
        JSON.parse(builder.getValue().translations!.en['block:p/rich']).content,
    ).toEqual(en);
    fireEvent.change(screen.getByLabelText('Words language'), {
        target: { value: 'en' },
    });
    const english = await waitFor(() => {
        const element = document.querySelector<EditorElement>(
            '[data-inline-words] .ProseMirror',
        );
        expect(element?.textContent).toBe('Open today');
        return element!;
    });
    act(() => {
        const view = english.editor.view;
        view.dispatch(
            view.state.tr.removeMark(
                0,
                view.state.doc.content.size,
                view.state.schema.marks.bold,
            ),
        );
    });
    await waitFor(() =>
        expect(
            JSON.parse(builder.getValue().translations!.en['block:p/rich'])
                .content,
        ).toEqual(words('Open today')),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(
        JSON.parse(builder.getValue().translations!.en['block:p/rich']).content,
    ).toEqual(en);
    expect(
        (builder.getValue().sections[0] as RichSection).data.document[0]
            .content,
    ).toEqual(words('Buka hari ini'));
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(
        JSON.parse(builder.getValue().translations!.en['block:p/rich']).content,
    ).toEqual(words('Open today'));
    fireEvent.click(screen.getByRole('button', { name: 'Format words' }));
    const splitEditor = await waitFor(() => {
        const element = document.querySelector<EditorElement>(
            '[data-inline-words] .ProseMirror',
        );
        expect(element?.textContent).toBe('Open today');
        return element!;
    });
    act(() => {
        const view = splitEditor.editor.view;
        let from = -1;
        view.state.doc.descendants((node, pos) => {
            if (node.isText && node.text === 'Open today') from = pos;
        });
        expect(from).toBeGreaterThan(-1);
        view.dispatch(
            view.state.tr.addMark(
                from,
                from + 4,
                view.state.schema.marks.bold.create(),
            ),
        );
    });
    await waitFor(() =>
        expect(
            JSON.parse(builder.getValue().translations!.en['block:p/rich'])
                .content,
        ).toEqual([
            { type: 'text', text: 'Open', styles: { bold: true } },
            ...words(' today'),
        ]),
    );
    expect(
        (builder.getValue().sections[0] as RichSection).data.document[0]
            .content,
    ).toEqual(words('Buka hari ini'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(adapter.save).toHaveBeenCalled());
    expect(
        JSON.parse(
            adapter.save.mock.calls[0][0].translations!.en['block:p/rich'],
        ).content,
    ).toEqual([
        { type: 'text', text: 'Open', styles: { bold: true } },
        ...words(' today'),
    ]);
});

it('refuses an ambiguous table edit while preserving its cell translations and unrelated editor changes', async () => {
    const table = {
        id: 'table',
        type: 'table',
        content: {
            type: 'tableContent',
            rows: [
                {
                    cells: [
                        {
                            type: 'tableCell',
                            _id: 'c1',
                            props: {},
                            content: words('Nama'),
                        },
                    ],
                },
            ],
        },
        children: [],
    };
    const { builder } = mountBuilder({
        fieldLanguages,
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
                                content: words('Top'),
                                children: [],
                            },
                            table,
                        ],
                    },
                },
            ],
            translations: {
                en: { 'block:table/rich-cell:c1': rich(words('Name')) },
            },
        },
    });
    await openText();
    fireEvent.click(
        screen.getByRole('button', { name: 'Edit in the section' }),
    );
    const element = await waitFor(() => {
        const el = document.querySelector(
            '[data-section-editor] .ProseMirror',
        ) as HTMLElement & {
            editor: { view: import('@tiptap/pm/view').EditorView };
        };
        expect(el?.editor.view).toBeTruthy();
        return el;
    });
    act(() => {
        const view = element.editor.view;
        let at = -1;
        view.state.doc.descendants((node, pos) => {
            if (node.isText && node.text === 'Nama') at = pos;
        });
        expect(at).toBeGreaterThan(-1);
        view.dispatch(view.state.tr.insertText('Changed', at, at + 4));
    });
    expect(await screen.findByRole('alert')).toHaveProperty(
        'textContent',
        'This table edit was not applied because its cell identities cannot be tracked safely. Rebuild the table translations before changing its structure.',
    );
    expect(
        builder.getValue().translations?.en['block:table/rich-cell:c1'],
    ).toBe(rich(words('Name')));
    expect(
        JSON.stringify(
            (builder.getValue().sections[0] as RichSection).data.document[1]
                .content,
        ),
    ).toContain('c1');
    expect(JSON.stringify(builder.getValue().sections)).not.toContain(
        'Changed',
    );
});

it('creates a relative English inline link through the Words toolbar and saves the unchanged path', async () => {
    const { builder, adapter } = mountBuilder({
        fieldLanguages,
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
                                content: [],
                                children: [],
                            },
                        ],
                    },
                },
            ],
            translations: {
                en: { 'block:p/rich': rich(words('Send an enquiry')) },
            },
        },
    });
    await openText();
    fireEvent.change(screen.getByLabelText('Words language'), {
        target: { value: 'en' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Format words' }));
    const input = await waitFor(() => {
        const element = screen.getByRole('textbox', { name: 'Words' });
        expect(element.getAttribute('contenteditable')).toBe('true');
        return element;
    });
    act(() => {
        input.focus();
        const text = input.querySelector('p')!.firstChild!;
        const range = document.createRange();
        range.setStart(text, 0);
        range.setEnd(text, 4);
        window.getSelection()!.removeAllRanges();
        window.getSelection()!.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));
        fireEvent.mouseUp(input);
    });
    const createLink = await screen.findByRole('button', {
        name: 'Create link',
    });
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
    });
    fireEvent.click(createLink);
    const url = await screen.findByPlaceholderText('Edit URL');
    for (const href of ['https:///en/stationery', 'javascript:alert(1)']) {
        fireEvent.change(url, { target: { value: href } });
        fireEvent.keyDown(url, { key: 'Enter' });
        expect(
            screen.getByRole('alert', { hidden: true }).textContent,
        ).toContain('unsafe or invalid');
        expect(
            JSON.parse(builder.getValue().translations!.en['block:p/rich'])
                .content,
        ).toEqual(words('Send an enquiry'));
    }
    fireEvent.change(url, {
        target: { value: '/en/stationery?source=field-qa#items' },
    });
    fireEvent.keyDown(url, { key: 'Enter' });
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(
        JSON.parse(builder.getValue().translations!.en['block:p/rich']).content,
    ).toEqual([
        {
            type: 'link',
            href: '/en/stationery?source=field-qa#items',
            content: words('Send'),
        },
        ...words(' an enquiry'),
    ]);
    expect(
        (builder.getValue().sections[0] as RichSection).data.document[0]
            .content,
    ).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(adapter.save).toHaveBeenCalled());
    expect(
        adapter.save.mock.calls[0][0].translations!.en['block:p/rich'],
    ).toContain('/en/stationery?source=field-qa#items');
});
