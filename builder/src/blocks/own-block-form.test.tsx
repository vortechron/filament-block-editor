import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { type ReactNode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HostContext, type Host } from '@/lib/host';
import { I18nContext } from '@/lib/i18n';
import type { DynamicValueDefinition, OwnBlockDefinition, PageLinkOption } from '@/types';
import { OwnBlockForm } from './own-block-form';
import { DEFAULT_KIT } from '@/lib/kit';

const board: OwnBlockDefinition = {
    kind: 'stationery-board',
    label: 'Stationery board',
    fields: [
        { name: 'heading', type: 'text', label: 'Heading', default: 'Stationery' },
        { name: 'intro', type: 'textarea', label: 'Intro' },
        {
            name: 'style',
            type: 'select',
            label: 'Style',
            options: [
                { value: 'plain', label: 'Plain' },
                { value: 'boxed', label: 'Boxed' },
            ],
            default: 'plain',
        },
        { name: 'show_prices', type: 'toggle', label: 'Show prices', default: true },
        { name: 'limit', type: 'number', label: 'Limit' },
        { name: 'photo', type: 'image', label: 'Photo' },
        { name: 'link', type: 'link', label: 'Link' },
        {
            name: 'items',
            type: 'list',
            label: 'Items',
            fields: [{ name: 'name', type: 'text', label: 'Name' }],
            maxItems: 2,
        },
    ],
};

function wrap(
    upload: Host['upload'] = vi.fn(),
    developer = false,
    dynamicValues: DynamicValueDefinition[] = [],
    pages: PageLinkOption[] = [],
) {
    const host: Host = {
        adapter: {
            save: vi.fn(),
            preview: vi.fn(),
            upload: vi.fn(),
        },
        ownBlocks: [board],
        accent: '#2563eb',
        upload,
        title: '',
        backUrl: null,
        viewUrl: null,
        developer,
        fonts: [],
        kit: DEFAULT_KIT,
        kitDefaults: DEFAULT_KIT,
        dynamicValues,
        pages,
        syncedSections: [],
        parts: [],
        siteInfo: null,
        kind: 'page',
    };

    return ({ children }: { children: ReactNode }) => (
        <I18nContext value={{ locale: 'en', strings: {} }}>
            <HostContext value={host}>{children}</HostContext>
        </I18nContext>
    );
}

afterEach(cleanup);

/** Keeps the values string the way the item panel does: in the block. */
function Harness({ onChange }: { onChange: (values: string) => void }) {
    const [values, setValues] = useState('{}');

    return (
        <OwnBlockForm
            definition={board}
            values={values}
            onChange={(next) => {
                setValues(next);
                onChange(next);
            }}
        />
    );
}

describe('developer-only fields of an own block', () => {
    const tracked: OwnBlockDefinition = {
        kind: 'tracked',
        label: 'Tracked',
        fields: [
            { name: 'title', type: 'text', label: 'Title' },
            { name: 'pixel', type: 'text', label: 'Pixel id', developerOnly: true },
        ],
    };

    it('are hidden from others, and keep their value when the rest changes', () => {
        const onChange = vi.fn();

        render(
            <OwnBlockForm
                definition={tracked}
                values='{"title":"A","pixel":"px-1"}'
                onChange={onChange}
            />,
            { wrapper: wrap() },
        );

        expect(screen.queryByLabelText('Pixel id')).toBeNull();

        fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'B' } });

        expect(JSON.parse(onChange.mock.calls.at(-1)?.[0])).toEqual({
            title: 'B',
            pixel: 'px-1',
        });
    });

    it('show for a developer', () => {
        render(
            <OwnBlockForm definition={tracked} values="{}" onChange={() => {}} />,
            { wrapper: wrap(vi.fn(), true) },
        );

        expect(screen.getByLabelText('Pixel id')).toBeTruthy();
    });
});

describe('the form for an own block', () => {
    it('shows the values, with the definition’s defaults for empty fields', () => {
        render(
            <OwnBlockForm definition={board} values='{"intro":"Hello"}' onChange={() => {}} />,
            { wrapper: wrap() },
        );

        expect(screen.getByLabelText('Heading')).toHaveProperty('value', 'Stationery');
        expect(screen.getByLabelText('Intro')).toHaveProperty('value', 'Hello');
        expect(screen.getByRole('switch', { name: 'Show prices' })).toHaveProperty(
            'ariaChecked',
            'true',
        );
    });

    it('writes every change back as one JSON object string', () => {
        const onChange = vi.fn();

        render(<OwnBlockForm definition={board} values="{}" onChange={onChange} />, {
            wrapper: wrap(),
        });

        fireEvent.change(screen.getByLabelText('Heading'), {
            target: { value: 'Pens' },
        });

        const written = onChange.mock.calls.at(-1)?.[0];

        expect(typeof written).toBe('string');
        expect(JSON.parse(written)).toMatchObject({
            heading: 'Pens',
            style: 'plain',
            show_prices: true,
        });
    });

    it('keeps numbers as numbers, and an empty number as null', () => {
        const onChange = vi.fn();

        render(<Harness onChange={onChange} />, { wrapper: wrap() });

        fireEvent.change(screen.getByLabelText('Limit'), { target: { value: '12' } });
        expect(JSON.parse(onChange.mock.calls.at(-1)?.[0]).limit).toBe(12);

        fireEvent.change(screen.getByLabelText('Limit'), { target: { value: '' } });
        expect(JSON.parse(onChange.mock.calls.at(-1)?.[0]).limit).toBeNull();
    });

    it('switches toggles and picks select options', () => {
        const onChange = vi.fn();

        render(<OwnBlockForm definition={board} values="{}" onChange={onChange} />, {
            wrapper: wrap(),
        });

        fireEvent.click(screen.getByRole('switch', { name: 'Show prices' }));
        expect(JSON.parse(onChange.mock.calls.at(-1)?.[0]).show_prices).toBe(false);

        fireEvent.click(screen.getByRole('radio', { name: 'Boxed' }));
        expect(JSON.parse(onChange.mock.calls.at(-1)?.[0]).style).toBe('boxed');
    });

    it('adds list rows up to the limit, and edits a row’s fields', () => {
        const onChange = vi.fn();
        const { rerender } = render(
            <OwnBlockForm definition={board} values="{}" onChange={onChange} />,
            { wrapper: wrap() },
        );

        fireEvent.click(screen.getByRole('button', { name: 'Add to Items' }));

        const oneRow = onChange.mock.calls.at(-1)?.[0];

        expect(JSON.parse(oneRow).items).toEqual([{ name: '' }]);

        rerender(
            <OwnBlockForm
                definition={board}
                values={JSON.stringify({ items: [{ name: 'a' }, { name: 'b' }] })}
                onChange={onChange}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Add to Items' }),
        ).toHaveProperty('disabled', true);

        fireEvent.change(screen.getAllByLabelText('Name')[1], {
            target: { value: 'Blue pen' },
        });
        expect(JSON.parse(onChange.mock.calls.at(-1)?.[0]).items).toEqual([
            { name: 'a' },
            { name: 'Blue pen' },
        ]);
    });

    it('warns about a link that will not work, and keeps what was typed', () => {
        const onChange = vi.fn();

        render(
            <OwnBlockForm
                definition={board}
                values='{"link":"javascript:alert(1)"}'
                onChange={onChange}
            />,
            { wrapper: wrap() },
        );

        expect(screen.getByRole('alert').textContent).toContain(
            'This link will not work',
        );
    });

    it('uploads a photo through the host and keeps its address', async () => {
        const upload = vi.fn(async () => '/storage/photo.jpg');
        const onChange = vi.fn();

        render(<OwnBlockForm definition={board} values="{}" onChange={onChange} />, {
            wrapper: wrap(upload),
        });

        const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });

        await act(async () => {
            fireEvent.change(screen.getByLabelText('Photo'), {
                target: { files: [file] },
            });
        });

        expect(upload).toHaveBeenCalledWith(file, 'image');
        expect(JSON.parse(onChange.mock.calls.at(-1)?.[0]).photo).toBe(
            '/storage/photo.jpg',
        );
    });
});

const PAGES: PageLinkOption[] = [
    { title: 'Stationery', url: '/stationery' },
    { title: 'Hubungi', url: '/hubungi' },
];

describe('pages in a link field', () => {
    function renderLink(values: string, pages: PageLinkOption[], shop: DynamicValueDefinition[] = []) {
        const onChange = vi.fn();

        function Linked() {
            const [current, setCurrent] = useState(values);

            return (
                <OwnBlockForm
                    definition={board}
                    values={current}
                    onChange={(next) => {
                        setCurrent(next);
                        onChange(next);
                    }}
                />
            );
        }

        render(<Linked />, { wrapper: wrap(vi.fn(), false, shop, pages) });

        return onChange;
    }

    it('list the pages first in the one picker, and store the plain url of the page picked', () => {
        const onChange = renderLink('{}', PAGES, [
            { key: 'site.whatsapp', label: 'WhatsApp', type: 'link', group: 'Contact', preview: 'https://wa.me/6012' },
        ]);

        fireEvent.click(screen.getByRole('button', { name: 'Pages and links' }));

        const groups = screen.getAllByRole('group');

        expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual(['Pages', 'Contact']);
        expect(within(groups[0]).getByText('/hubungi')).toBeTruthy();

        fireEvent.click(screen.getByRole('option', { name: /Stationery/ }));

        expect(lastValues(onChange).link).toBe('/stationery');
        expect(screen.getByText('Page: Stationery')).toBeTruthy();
        expect((screen.getByRole('textbox', { name: 'Link' }) as HTMLInputElement).value).toBe('/stationery');
    });

    it('still store @key when a shop link is picked', () => {
        const onChange = renderLink('{}', PAGES, [
            { key: 'site.whatsapp', label: 'WhatsApp', type: 'link', group: 'Contact', preview: null },
        ]);

        fireEvent.click(screen.getByRole('button', { name: 'Pages and links' }));
        fireEvent.click(screen.getByRole('option', { name: /WhatsApp/ }));

        expect(lastValues(onChange).link).toBe('@site.whatsapp');
    });

    it('show the picker when the site has pages but no shop links', () => {
        renderLink('{}', PAGES);

        expect(screen.getByRole('button', { name: 'Pages and links' })).toBeTruthy();
    });

    it('name the page under a link that holds its url, and keep the generic hint for any other', () => {
        renderLink('{"link":"/hubungi"}', PAGES);

        expect(screen.getByText('Page: Hubungi')).toBeTruthy();
        cleanup();
        renderLink('{"link":"/other"}', PAGES);

        expect(screen.queryByText(/^Page:/)).toBeNull();
        expect(screen.getByText(/A web address/)).toBeTruthy();
    });

    it('keep "Shop links" and the old behaviour when the site has no pages', () => {
        const onChange = renderLink('{}', [], [
            { key: 'site.whatsapp', label: 'WhatsApp', type: 'link', group: 'Contact', preview: null },
        ]);

        fireEvent.click(screen.getByRole('button', { name: 'Shop links' }));

        expect(screen.queryByRole('group', { name: 'Pages' })).toBeNull();

        fireEvent.click(screen.getByRole('option', { name: /WhatsApp/ }));

        expect(lastValues(onChange).link).toBe('@site.whatsapp');
    });

    it('show no picker with neither pages nor shop links', () => {
        renderLink('{}', []);

        expect(screen.queryByRole('button', { name: /links/ })).toBeNull();
    });
});

const SHOP_VALUES: DynamicValueDefinition[] = [
    { key: 'site.phone', label: 'Phone', type: 'text', group: 'Contact', preview: '012-345 6789' },
    { key: 'site.email', label: 'Email', type: 'text', group: 'Contact', preview: null },
    { key: 'site.whatsapp', label: 'WhatsApp', type: 'link', group: 'Contact', preview: 'https://wa.me/6012' },
];

/** The board's form with shop values in its text fields, as the item panel shows it. */
function renderWithShopValues(values: string, onChange = vi.fn()) {
    render(<OwnBlockForm definition={board} values={values} onChange={onChange} allowShopValues />, {
        wrapper: wrap(vi.fn(), false, SHOP_VALUES),
    });

    return onChange;
}

/** What the chips in a field show, in order. */
const chipsIn = (field: HTMLElement) =>
    [...field.querySelectorAll('[data-short-code]')].map((chip) => chip.textContent);

const lastValues = (onChange: ReturnType<typeof vi.fn>) => JSON.parse(onChange.mock.calls.at(-1)?.[0]);

describe('shop values in an own block’s text fields', () => {
    it('show each {key} as a chip with its label and what it is now, and say when a value is gone', () => {
        renderWithShopValues(JSON.stringify({ heading: 'Hubungi {site.phone} atau {site.gone}', intro: 'Baris 1\n{site.email}' }));

        expect(chipsIn(screen.getByRole('textbox', { name: 'Heading' }))).toEqual([
            'Phone· 012-345 6789',
            'site.gone· no longer exists',
        ]);
        expect(screen.getByRole('textbox', { name: 'Intro' }).textContent).toBe('Baris 1Email');
        expect(screen.getByRole('textbox', { name: 'Intro' }).getAttribute('aria-multiline')).toBe('true');
    });

    it('show a link or a picture value typed into the words as broken, since words only show text', () => {
        renderWithShopValues(JSON.stringify({ heading: 'Chat {site.whatsapp}' }));

        expect(chipsIn(screen.getByRole('textbox', { name: 'Heading' }))).toEqual(['WhatsApp· no longer exists']);
    });

    it('put a picked shop value at the end of the words, stored as {key}, and undo takes it out', () => {
        const onChange = renderWithShopValues(JSON.stringify({ heading: 'Hubungi ' }));
        const heading = screen.getByRole('group', { name: 'Heading' });

        fireEvent.click(within(heading).getByRole('button', { name: 'Shop value' }));
        // Only text values go in words.
        expect(within(heading).queryByRole('option', { name: /WhatsApp/ })).toBeNull();
        fireEvent.click(within(heading).getByRole('option', { name: /Phone/ }));

        expect(lastValues(onChange).heading).toBe('Hubungi {site.phone}');
        expect(chipsIn(screen.getByRole('textbox', { name: 'Heading' }))).toEqual(['Phone· 012-345 6789']);

        fireEvent.keyDown(screen.getByRole('textbox', { name: 'Heading' }), { key: 'z', ctrlKey: true });

        expect(lastValues(onChange).heading).toBe('Hubungi ');
    });

    it('keep a one-line field on one line, and give a textarea a new line on Enter', () => {
        const onChange = renderWithShopValues(JSON.stringify({ heading: 'Satu', intro: 'Satu' }));

        fireEvent.keyDown(screen.getByRole('textbox', { name: 'Heading' }), { key: 'Enter' });
        expect(onChange).not.toHaveBeenCalled();

        fireEvent.keyDown(screen.getByRole('textbox', { name: 'Intro' }), { key: 'Enter' });
        expect(lastValues(onChange).intro.split('\n')).toHaveLength(2);
    });

    it('are plain boxes when the site has no text values', () => {
        render(<OwnBlockForm definition={board} values="{}" onChange={vi.fn()} allowShopValues />, {
            wrapper: wrap(),
        });

        expect(screen.getByLabelText('Heading')).toHaveProperty('value', 'Stationery');
        expect(screen.queryByRole('button', { name: 'Shop value' })).toBeNull();
    });
});

describe('an icon choice', () => {
    const svg = (d: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="${d}"/></svg>`;
    const badge = (count: number): OwnBlockDefinition => ({
        kind: 'badge',
        label: 'Badge',
        fields: [
            {
                name: 'icon',
                type: 'select',
                label: 'Icon',
                options: Array.from({ length: count }, (_, index) => ({
                    value: `i${index}`,
                    label: `Icon ${index}`,
                    svg: svg(`M${index} 0`),
                })),
                default: 'i0',
            },
        ],
    });

    it('shows a picture of every icon to tap, not a list of names', () => {
        const onChange = vi.fn();

        render(<OwnBlockForm definition={badge(12)} values="{}" onChange={onChange} />, { wrapper: wrap() });

        expect(screen.queryByRole('combobox')).toBeNull();
        const group = screen.getByRole('radiogroup', { name: 'Icon' });
        const choices = within(group).getAllByRole('radio');

        expect(choices).toHaveLength(12);
        expect(choices[0].getAttribute('aria-checked')).toBe('true');
        expect(choices[3].querySelector('path')?.getAttribute('d')).toBe('M3 0');
        expect(screen.getByText('Icon 0')).toBeTruthy();

        fireEvent.click(screen.getByRole('radio', { name: 'Icon 7' }));
        expect(JSON.parse(onChange.mock.calls.at(-1)?.[0] as string).icon).toBe('i7');
    });

    it('shows each name beside its picture when there are only a few', () => {
        render(<OwnBlockForm definition={badge(3)} values="{}" onChange={vi.fn()} />, { wrapper: wrap() });

        const choice = screen.getByRole('radio', { name: 'Icon 2' });

        expect(choice.textContent).toContain('Icon 2');
        expect(choice.querySelector('svg')).toBeTruthy();
    });
});

