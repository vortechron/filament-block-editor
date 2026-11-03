import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HostContext, type Host } from '@/lib/host';
import { I18nContext } from '@/lib/i18n';
import type { OwnBlockDefinition } from '@/types';
import { OwnBlockForm } from './own-block-form';

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

function wrap(upload: Host['upload'] = vi.fn(), developer = false) {
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
        kit: null,
        dynamicValues: [],
        syncedSections: [],
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
