import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountPageBuilder } from '../src/index';
import type { PageBuilderAdapter, PageValue, SaveResult } from '../src/types';

const value: PageValue = {
    sections: [
        {
            id: 'hero0001',
            type: 'rich',
            data: {
                document: [
                    {
                        type: 'heading',
                        props: { level: 1 },
                        content: [{ type: 'text', text: 'Selamat datang', styles: {} }],
                        children: [],
                    },
                ],
                layout: 'hero',
            },
        } as never,
    ],
};

function makeAdapter(save: () => Promise<SaveResult> = async () => ({ ok: true })) {
    return {
        save: vi.fn((_value: PageValue) => save()),
        preview: vi.fn(
            async (_value: PageValue) =>
                '<!doctype html><html><body></body></html>',
        ),
        upload: vi.fn(async (_file: File, _kind: string) => ({
            url: '/storage/a.jpg',
        })),
    } satisfies PageBuilderAdapter;
}

let unmount: (() => void) | null = null;

type MountOptions = Omit<Partial<Parameters<typeof mountPageBuilder>[1]>, 'adapter'> & {
    adapter?: ReturnType<typeof makeAdapter>;
};

function mount(options: MountOptions = {}) {
    const element = document.createElement('div');

    document.body.append(element);

    const adapter = options.adapter ?? makeAdapter();
    let builder!: ReturnType<typeof mountPageBuilder>;

    act(() => {
        builder = mountPageBuilder(element, {
            value,
            locale: 'en',
            ...options,
            adapter,
        });
    });
    unmount = () => {
        act(() => builder.unmount());
        element.remove();
    };

    return { builder, adapter, element };
}

/** Hides the first section from the Structure list: a real change. */
async function hideFirstSection() {
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(
        await screen.findByRole('button', {
            name: 'Hide section 1 from the page',
        }),
    );
}

afterEach(() => {
    unmount?.();
    unmount = null;
});

describe('mounting the page builder', () => {
    it('asks the adapter to preview the page value it was given', async () => {
        const { adapter } = mount();

        await waitFor(() => expect(adapter.preview).toHaveBeenCalled());

        const previewed = adapter.preview.mock.calls[0][0] as PageValue;

        expect(previewed.sections).toHaveLength(1);
        expect(previewed.sections[0].id).toBe('hero0001');
        expect(previewed.sections[0].data.layout).toBe('hero');
        // Missing look fields come with their defaults.
        expect(previewed.sections[0].data.width).toBe('normal');
    });

    it('draws inside one scoped element, with menus in its own layer', () => {
        const { element } = mount();
        const root = element.firstElementChild;

        expect(root?.classList.contains('fbe-builder')).toBe(true);
        expect(root?.querySelector('[data-fbe-portal]')).not.toBeNull();
        expect(document.body.children).toHaveLength(1);
    });

    it('saves the changed value through the adapter, and reports it', async () => {
        const onChange = vi.fn();
        const { adapter, builder } = mount({ onChange });

        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty(
            'disabled',
            true,
        );

        await hideFirstSection();

        expect(onChange).toHaveBeenCalled();
        expect(onChange.mock.lastCall?.[0].sections[0].hidden).toBe(true);
        expect(builder.getValue().sections[0].hidden).toBe(true);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        });

        expect(adapter.save).toHaveBeenCalledTimes(1);
        expect(adapter.save.mock.calls[0][0]).toEqual(builder.getValue());
        expect(await screen.findByText('Saved')).toBeTruthy();
    });

    it('saves with Ctrl+S too', async () => {
        const { adapter } = mount();

        await hideFirstSection();
        await act(async () => {
            fireEvent.keyDown(window, { key: 's', ctrlKey: true });
        });

        expect(adapter.save).toHaveBeenCalledTimes(1);
    });

    it('shows what the host refused, and keeps the changes unsaved', async () => {
        const adapter = makeAdapter(async () => ({
            ok: false,
            errors: { 'sections.0.data.anchor': 'That link name is taken.' },
        }));

        mount({ adapter });
        await hideFirstSection();
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        });

        expect(await screen.findByText(/That link name is taken\./)).toBeTruthy();
        expect(screen.getByText('Your changes were not saved')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty(
            'disabled',
            false,
        );
    });

    it('shows the back and view links only when the host gives them', () => {
        mount({ backUrl: '/admin/pages', viewUrl: 'https://example.com/' });

        expect(
            screen.getByRole('link', { name: 'Back' }).getAttribute('href'),
        ).toBe('/admin/pages');
        expect(
            screen.getByRole('link', { name: 'View page' }).getAttribute('href'),
        ).toBe('https://example.com/');
    });

    it('has no back or view link without them', () => {
        mount();

        expect(screen.queryByRole('link', { name: 'Back' })).toBeNull();
        expect(screen.queryByRole('link', { name: 'View page' })).toBeNull();
    });

    it('speaks Malay by default, and takes the host’s own texts', () => {
        mount({ locale: undefined, strings: { Save: 'Terbitkan' } });

        expect(screen.getByRole('tab', { name: 'Tambah' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Terbitkan' })).toBeTruthy();
    });

    it('refuses an adapter without save, preview and upload', () => {
        expect(() =>
            mountPageBuilder(document.createElement('div'), {
                adapter: { save: vi.fn() } as never,
            }),
        ).toThrow('adapter');
    });
});
