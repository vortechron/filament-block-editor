import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PageValueInput, RichSection } from '../src/types';
import { loadCanvasPage } from './frame-helpers';
import { makeAdapter, mountBuilder, pickSection } from './mount-helpers';

/** Two sections, so one can go and come back. */
const PAGE: PageValueInput = {
    version: 2,
    sections: [
        {
            id: 'hero0001',
            type: 'rich',
            data: {
                layout: 'hero',
                document: [
                    {
                        id: 'head0001',
                        type: 'heading',
                        props: { level: 1 },
                        content: [{ type: 'text', text: 'Selamat datang', styles: {} }],
                        children: [],
                    },
                ],
            },
        },
        {
            id: 'about002',
            type: 'rich',
            data: {
                layout: 'plain',
                document: [
                    {
                        id: 'head0002',
                        type: 'heading',
                        props: { level: 2 },
                        content: [{ type: 'text', text: 'Tentang kami', styles: {} }],
                        children: [],
                    },
                    {
                        id: 'butn0002',
                        type: 'button',
                        props: { text: 'Hubungi', url: '', variant: 'solid' },
                        children: [],
                    },
                ],
            },
        },
    ],
};

const button = (name: string) => screen.getByRole('button', { name });

/** Undo and Redo in the top bar (the note after a delete has an Undo too). */
const topBar = (name: 'Undo' | 'Redo') =>
    within(screen.getByRole('banner')).getByRole('button', { name });

/** The top bar's Save, which reads "Saved" for a moment after a save. */
const saveButton = () => screen.getByRole('button', { name: /^Saved?$/ });

type Builder = ReturnType<typeof mountBuilder>['builder'];

const sectionIds = (builder: Builder) => builder.getValue().sections.map((section) => section.id);

/** Deletes the picked section with its button, then says yes. */
function deletePickedSection() {
    fireEvent.click(button('Delete section'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete section' }));
}

describe('undo and redo in the top bar', () => {
    it('start greyed out, bring a deleted section back picked, and redo deletes it again', async () => {
        const { builder } = mountBuilder({ value: PAGE });

        expect(topBar('Undo')).toHaveProperty('disabled', true);
        expect(topBar('Redo')).toHaveProperty('disabled', true);

        await pickSection(/Tentang kami/);
        deletePickedSection();

        expect(sectionIds(builder)).toEqual(['hero0001']);
        expect(topBar('Undo')).toHaveProperty('disabled', false);

        fireEvent.click(topBar('Undo'));

        expect(sectionIds(builder)).toEqual(['hero0001', 'about002']);
        expect(await screen.findByText(/Section 2 of 2/)).toBeTruthy();
        expect(topBar('Undo')).toHaveProperty('disabled', true);
        expect(topBar('Redo')).toHaveProperty('disabled', false);

        fireEvent.click(topBar('Redo'));

        expect(sectionIds(builder)).toEqual(['hero0001']);
        // Nothing is picked: the sidebar is back on its home panels.
        expect(await screen.findByRole('tab', { name: 'Structure' })).toBeTruthy();
        expect(screen.queryByText(/Section 2 of 2/)).toBeNull();
        expect(topBar('Redo')).toHaveProperty('disabled', true);
    });
});

describe('the top bar below 1024px', () => {
    it('makes room for undo: the host’s extra buttons are in a More menu as well', async () => {
        const adapter = {
            ...makeAdapter(),
            saveKit: vi.fn(async () => ({ ok: true as const })),
            saveSiteInfo: vi.fn(async () => ({ ok: true as const })),
        };

        mountBuilder({
            value: PAGE,
            adapter,
            viewUrl: 'https://kedai.example/',
            siteInfo: {
                groups: [{ key: 'contact', label: 'Contact', fields: [{ name: 'phone', type: 'text', label: 'Phone' }] }],
                values: {},
            },
        });

        // Radix menus open on a key press in jsdom.
        fireEvent.keyDown(within(screen.getByRole('banner')).getByRole('button', { name: 'More' }), {
            key: 'Enter',
        });

        const menu = await screen.findByRole('menu');

        expect(within(menu).getByRole('menuitem', { name: 'View page' }).getAttribute('href')).toBe(
            'https://kedai.example/',
        );
        expect(within(menu).getByRole('menuitem', { name: 'Shop info' })).toBeTruthy();

        fireEvent.click(within(menu).getByRole('menuitem', { name: 'Design' }));

        expect(await screen.findByRole('button', { name: 'Save design' })).toBeTruthy();
    });
});

/** Hides the first section from the Structure list: one step. */
async function hideFirstSection() {
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Hide section 1 from the page' }));
}

const isFirstHidden = (builder: Builder) => builder.getValue().sections[0].hidden === true;

describe('the undo keys', () => {
    it('undo with Ctrl+Z or ⌘Z, and redo with Ctrl+Shift+Z, ⇧⌘Z or Ctrl+Y, outside a text box', async () => {
        const { builder } = mountBuilder({ value: PAGE });

        await hideFirstSection();
        fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });

        expect(isFirstHidden(builder)).toBe(false);

        fireEvent.keyDown(document.body, { key: 'Z', ctrlKey: true, shiftKey: true });

        expect(isFirstHidden(builder)).toBe(true);

        fireEvent.keyDown(document.body, { key: 'z', metaKey: true });
        fireEvent.keyDown(document.body, { key: 'y', ctrlKey: true });

        expect(isFirstHidden(builder)).toBe(true);

        fireEvent.keyDown(document.body, { key: 'z', metaKey: true });
        fireEvent.keyDown(document.body, { key: 'z', metaKey: true, shiftKey: true });

        expect(isFirstHidden(builder)).toBe(true);
    });

    it('leave a text box its own undo', async () => {
        const { builder } = mountBuilder({ value: PAGE });

        await hideFirstSection();
        fireEvent.click(screen.getByRole('tab', { name: 'Add' }));

        const search = screen.getByRole('searchbox');

        search.focus();
        fireEvent.keyDown(search, { key: 'z', metaKey: true });

        expect(isFirstHidden(builder)).toBe(true);

        const editable = document.createElement('div');

        editable.setAttribute('contenteditable', 'true');
        document.body.append(editable);
        fireEvent.keyDown(editable, { key: 'z', ctrlKey: true });
        editable.remove();

        expect(isFirstHidden(builder)).toBe(true);
    });

    it('do nothing behind an open dialog or menu', async () => {
        const { builder } = mountBuilder({ value: PAGE });

        await hideFirstSection();
        await pickSection(/Tentang kami/);
        fireEvent.click(button('Delete section'));

        const dialog = screen.getByRole('dialog');

        fireEvent.keyDown(within(dialog).getByRole('button', { name: 'Cancel' }), { key: 'z', metaKey: true });

        expect(isFirstHidden(builder)).toBe(true);

        const menu = document.createElement('div');

        menu.setAttribute('role', 'menu');
        menu.append(document.createElement('button'));
        document.body.append(menu);
        fireEvent.keyDown(menu.firstElementChild!, { key: 'z', ctrlKey: true });
        menu.remove();

        expect(isFirstHidden(builder)).toBe(true);
    });

    it('still work in the phone’s bottom sheet', async () => {
        const matchMedia = window.matchMedia;

        window.matchMedia = ((query: string) => ({ ...matchMedia(query), matches: false })) as typeof matchMedia;

        try {
            const { builder } = mountBuilder({ value: PAGE });

            fireEvent.click(screen.getByRole('button', { name: /Structure/ }));
            fireEvent.click(await screen.findByRole('button', { name: 'Hide section 1 from the page' }));

            const sheet = screen.getByRole('dialog', { name: 'Editor panel' });

            fireEvent.keyDown(within(sheet).getByRole('button', { name: 'Close the panel' }), {
                key: 'z',
                ctrlKey: true,
            });

            expect(isFirstHidden(builder)).toBe(false);
        } finally {
            window.matchMedia = matchMedia;
        }
    });

    it('work while the page on the canvas has the keyboard', async () => {
        const { builder } = mountBuilder({ value: PAGE });
        const page = await loadCanvasPage();

        await hideFirstSection();
        fireEvent.keyDown(page.body, { key: 'z', ctrlKey: true });

        expect(isFirstHidden(builder)).toBe(false);
    });
});

type TiptapView = {
    state: {
        doc: { descendants: (visit: (node: { isText: boolean; text?: string; nodeSize: number }, pos: number) => void) => void };
        tr: { insertText: (text: string, from: number) => unknown };
    };
    dispatch: (transaction: unknown) => void;
};

/** The open section's editor, as ProseMirror: the element and its view. */
async function openWords() {
    const element = await waitFor(() => {
        const found = document.querySelector('[data-section-editor] .ProseMirror');

        expect(found).not.toBeNull();

        return found as HTMLElement & { editor: { view: TiptapView } };
    });

    return { element, view: element.editor.view };
}

/** The place right after the text node holding `text`. */
function endOf(view: TiptapView, text: string): number {
    let at = -1;

    view.state.doc.descendants((node, pos) => {
        if (node.isText && node.text?.includes(text)) {
            at = pos + node.nodeSize;
        }
    });

    expect(at).toBeGreaterThan(-1);

    return at;
}

/** Types after `after` in the open words, one letter per change, as a keyboard does. */
async function typeInWords(after: string, text: string) {
    const { element, view } = await openWords();
    let at = endOf(view, after);

    fireEvent.keyDown(element, { key: text[0] });
    act(() => {
        for (const letter of text) {
            view.dispatch(view.state.tr.insertText(letter, at));
            at += 1;
        }
    });
}

const heroWords = (builder: Builder) => JSON.stringify(builder.getValue().sections[0]);

describe('undo in the section words', () => {
    it('takes back a typed sentence in one step, and the open words show it', async () => {
        const { builder } = mountBuilder({ value: PAGE });

        await pickSection(/Selamat datang/);
        await typeInWords('Selamat datang', ' ke kedai kami');

        expect(heroWords(builder)).toContain('Selamat datang ke kedai kami');

        const { element: typedIn } = await openWords();

        fireEvent.click(topBar('Undo'));

        expect(heroWords(builder)).not.toContain('ke kedai kami');
        expect(heroWords(builder)).toContain('Selamat datang');
        expect(topBar('Undo')).toHaveProperty('disabled', true);

        // A new editor, with the words as they were.
        await waitFor(async () => {
            const { element } = await openWords();

            expect(element).not.toBe(typedIn);
            expect(element.textContent).toContain('Selamat datang');
            expect(element.textContent).not.toContain('ke kedai kami');
        });

        // Items go into the new editor: the words stay as they were.
        fireEvent.click(screen.getByRole('button', { name: 'Add' }));
        fireEvent.click(await screen.findByRole('tab', { name: 'Items' }));
        fireEvent.click(screen.getByRole('button', { name: 'Line' }));

        await waitFor(() => expect(heroWords(builder)).toContain('"divider"'));
        expect(heroWords(builder)).not.toContain('ke kedai kami');
    });

    it('records nothing for the reopened words writing themselves back, but keeps every real change', async () => {
        const { builder } = mountBuilder({ value: PAGE });
        const clock = vi.spyOn(Date, 'now');

        await pickSection(/Selamat datang/);
        // Two steps, so the undo returns to words the editor wrote itself.
        clock.mockReturnValue(1_000_000);
        await typeInWords('Selamat datang', '!');
        clock.mockReturnValue(1_005_000);
        await typeInWords('Selamat datang!', '!');
        clock.mockRestore();
        fireEvent.click(topBar('Undo'));

        await waitFor(async () => {
            const { element } = await openWords();

            expect(element.textContent).toContain('Selamat datang!');
            expect(element.textContent).not.toContain('!!');
        });

        const { view } = await openWords();
        const saved = saveButton().hasAttribute('disabled');
        const tr = view.state.tr as unknown as {
            insertText: (text: string, from: number) => { delete: (from: number, to: number) => unknown };
        };

        // An exact echo: the editor changes and writes the same words back.
        const end = endOf(view, 'Selamat datang!');

        act(() => view.dispatch(tr.insertText('x', end).delete(end, end + 1)));

        expect(saveButton().hasAttribute('disabled')).toBe(saved);
        expect(topBar('Redo')).toHaveProperty('disabled', false);

        // A change with no key or tap, like dictation, reaches the page.
        act(() => view.dispatch(view.state.tr.insertText('?', endOf(view, 'Selamat datang!'))));

        expect(heroWords(builder)).toContain('Selamat datang!?');
        expect(topBar('Redo')).toHaveProperty('disabled', true);
    });
});

describe('undo and Save', () => {
    it('keeps the history after a save, and an undo past it makes the page unsaved again', async () => {
        const { builder, adapter } = mountBuilder({ value: PAGE });

        await hideFirstSection();
        fireEvent.click(saveButton());

        await waitFor(() => expect(adapter.save).toHaveBeenCalledTimes(1));
        await screen.findByText('Saved');
        expect(saveButton()).toHaveProperty('disabled', true);

        fireEvent.click(topBar('Undo'));

        expect(isFirstHidden(builder)).toBe(false);
        expect(saveButton()).toHaveProperty('disabled', false);

        fireEvent.click(topBar('Redo'));

        expect(isFirstHidden(builder)).toBe(true);
        expect(saveButton()).toHaveProperty('disabled', true);
    });
});

/** The note at the bottom of the screen after a delete: a live region, always there. */
function note(): HTMLElement {
    const region = document.querySelector<HTMLElement>('[data-undo-note]');

    expect(region?.getAttribute('role')).toBe('status');

    return region as HTMLElement;
}

describe('the note after a delete', () => {
    it('does not show, and nothing is recorded, when the section to delete is already gone', async () => {
        const { builder } = mountBuilder({ value: PAGE });

        fireEvent.click(screen.getByRole('button', { name: /^Text A heading/ }));

        expect(sectionIds(builder)).toHaveLength(3);

        fireEvent.click(await screen.findByRole('button', { name: 'Delete section' }));
        // Undone behind the dialog, as a stray key or tap could.
        fireEvent.click(
            within(screen.getByRole('banner', { hidden: true })).getByRole('button', {
                name: 'Undo',
                hidden: true,
            }),
        );

        expect(sectionIds(builder)).toEqual(['hero0001', 'about002']);

        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete section' }));

        expect(sectionIds(builder)).toEqual(['hero0001', 'about002']);
        expect(note().textContent).toBe('');
        expect(topBar('Redo')).toHaveProperty('disabled', false);
    });

    it('says a section was deleted, and its Undo brings the section back picked', async () => {
        const { builder } = mountBuilder({ value: PAGE });

        expect(note().textContent).toBe('');

        await pickSection(/Tentang kami/);
        deletePickedSection();

        expect(note().textContent).toContain('Section deleted');

        fireEvent.click(within(note()).getByRole('button', { name: 'Undo' }));

        expect(sectionIds(builder)).toEqual(['hero0001', 'about002']);
        expect(await screen.findByText(/Section 2 of 2/)).toBeTruthy();
        expect(note().textContent).toBe('');
    });

    it('says an item was deleted, and its Undo brings the item back', async () => {
        const { builder } = mountBuilder({ value: PAGE });
        const hasButton = () => JSON.stringify(builder.getValue().sections[1]).includes('butn0002');

        fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
        fireEvent.click(screen.getByRole('button', { name: 'Show items of section 2' }));
        fireEvent.click(screen.getByRole('button', { name: /^Button/ }));
        fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

        expect(hasButton()).toBe(false);
        expect(note().textContent).toContain('Item deleted');

        fireEvent.click(within(note()).getByRole('button', { name: 'Undo' }));

        expect(hasButton()).toBe(true);
        expect(note().textContent).toBe('');
    }, 20_000);

    it('goes after 6 seconds, or as soon as the page changes again', async () => {
        mountBuilder({ value: PAGE });

        await pickSection(/Tentang kami/);
        vi.useFakeTimers();

        try {
            deletePickedSection();
            act(() => vi.advanceTimersByTime(5900));

            expect(note().textContent).toContain('Section deleted');

            act(() => vi.advanceTimersByTime(200));

            expect(note().textContent).toBe('');
        } finally {
            vi.useRealTimers();
        }

        // The section comes back picked.
        fireEvent.click(topBar('Undo'));
        await screen.findByText(/Section 2 of 2/);
        deletePickedSection();

        expect(note().textContent).toContain('Section deleted');

        await hideFirstSection();

        expect(note().textContent).toBe('');
    });
});

/** Types into a box one letter at a time, as a keyboard does. */
function typeInto(box: HTMLElement, text: string) {
    let typed = (box as HTMLInputElement).value;

    for (const letter of text) {
        typed += letter;
        fireEvent.change(box, { target: { value: typed } });
    }
}

describe('steps in the panels', () => {
    it('are one per box typed in, and a new one for another setting, however soon', async () => {
        const { builder } = mountBuilder({ value: PAGE });
        const about = () => builder.getValue().sections[1] as { data: { anchor: string | null; width: string } };

        await pickSection(/Tentang kami/);
        fireEvent.click(screen.getByRole('tab', { name: 'Look' }));
        typeInto(screen.getByLabelText('Link name (#)'), 'tentang');
        fireEvent.click(screen.getByRole('switch', { name: 'Full width' }));

        expect(about().data).toMatchObject({ anchor: 'tentang', width: 'full' });

        fireEvent.click(topBar('Undo'));

        expect(about().data).toMatchObject({ anchor: 'tentang', width: 'normal' });

        fireEvent.click(topBar('Undo'));

        expect(about().data.anchor).toBeNull();
        expect(topBar('Undo')).toHaveProperty('disabled', true);
    });

    it('keep an item’s style change apart from typing in its settings', async () => {
        const { builder } = mountBuilder({ value: PAGE });
        const hubungi = () =>
            (builder.getValue().sections[1] as RichSection).data.document.find(
                (block) => block.id === 'butn0002',
            )!.props as { text?: string; look?: string };

        fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
        fireEvent.click(screen.getByRole('button', { name: 'Show items of section 2' }));
        fireEvent.click(screen.getByRole('button', { name: /^Button/ }));
        typeInto(await screen.findByLabelText('Button text'), ' kami');
        fireEvent.click(screen.getByRole('tab', { name: 'Style' }));
        fireEvent.change(screen.getByLabelText('Space inside, top'), { target: { value: '8' } });

        expect(hubungi()).toMatchObject({ text: 'Hubungi kami' });
        expect(hubungi().look).not.toBe('');

        fireEvent.click(topBar('Undo'));

        expect(hubungi()).toMatchObject({ text: 'Hubungi kami', look: '' });

        fireEvent.click(topBar('Undo'));

        expect(hubungi().text).toBe('Hubungi');
    }, 20_000);

    it('keep two different style changes of one item apart, however soon', async () => {
        const { builder } = mountBuilder({ value: PAGE });
        const look = () => {
            const props = (builder.getValue().sections[1] as RichSection).data.document.find(
                (block) => block.id === 'butn0002',
            )!.props as { look?: string };

            return props.look ?? '';
        };

        fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
        fireEvent.click(screen.getByRole('button', { name: 'Show items of section 2' }));
        fireEvent.click(screen.getByRole('button', { name: /^Button/ }));
        fireEvent.click(await screen.findByRole('tab', { name: 'Style' }));
        fireEvent.change(screen.getByLabelText('Space inside, top'), { target: { value: '8' } });
        fireEvent.change(screen.getByLabelText('Space inside, bottom'), { target: { value: '4' } });

        expect(look()).toContain('padding_bottom');

        fireEvent.click(topBar('Undo'));

        expect(look()).toContain('padding_top');
        expect(look()).not.toContain('padding_bottom');
    }, 20_000);

    it('fall back to the section when an undo takes away the picked item', async () => {
        const { builder } = mountBuilder({ value: PAGE });

        await pickSection(/Tentang kami/);
        fireEvent.click(screen.getByRole('button', { name: 'Add' }));
        fireEvent.click(await screen.findByRole('tab', { name: 'Items' }));
        fireEvent.click(screen.getByRole('button', { name: 'Line' }));

        expect(await screen.findByRole('button', { name: 'Edit in the section' })).toBeTruthy();

        fireEvent.click(topBar('Undo'));

        expect(JSON.stringify(builder.getValue().sections[1])).not.toContain('"divider"');
        // The section's panel shows, not an empty item panel.
        await waitFor(() => expect(screen.getByText(/Section 2 of 2/).closest('[hidden]')).toBeNull());
        expect(screen.queryByText('This item is no longer on the page.')).toBeNull();
    });
});

describe('a header or footer being built', () => {
    it('has the same undo, beside its own Save', async () => {
        const { builder } = mountBuilder({ value: PAGE, kind: 'header', title: 'Kedai Buku' });

        await pickSection(/Tentang kami/);
        deletePickedSection();

        expect(note().textContent).toContain('Section deleted');

        fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });

        expect(sectionIds(builder)).toEqual(['hero0001', 'about002']);
        expect(within(screen.getByRole('banner')).getByText('Header')).toBeTruthy();
    });
});
