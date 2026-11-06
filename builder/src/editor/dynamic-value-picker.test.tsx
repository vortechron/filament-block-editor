import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HostContext, type Host } from '@/lib/host';
import { I18nContext } from '@/lib/i18n';
import { DEFAULT_KIT } from '@/lib/kit';
import type { DynamicValueDefinition } from '@/types';
import { DynamicValuePicker } from './dynamic-value-picker';

const VALUES: DynamicValueDefinition[] = [
    { key: 'site.phone', label: 'Phone', type: 'text', group: 'Contact', preview: '012-345 6789' },
    { key: 'site.whatsapp', label: 'WhatsApp', type: 'link', group: 'Contact', preview: 'https://wa.me/6012' },
    { key: 'site.email', label: 'Email', type: 'text', group: 'Contact', preview: null },
    { key: 'site.name', label: 'Shop name', type: 'text', group: 'Business', preview: 'Kedai Buku' },
];

function wrap(values: DynamicValueDefinition[] = VALUES) {
    const host = {
        adapter: { save: vi.fn(), preview: vi.fn(), upload: vi.fn() },
        ownBlocks: [],
        accent: '#2563eb',
        upload: vi.fn(),
        title: '',
        backUrl: null,
        viewUrl: null,
        developer: false,
        fonts: [],
        kit: DEFAULT_KIT,
        kitDefaults: DEFAULT_KIT,
        dynamicValues: values,
        pages: [],
        syncedSections: [],
        parts: [],
        pageMenu: [],
        languages: [],
        siteInfo: null,
        kind: 'page',
    } satisfies Host;

    return ({ children }: { children: ReactNode }) => (
        <I18nContext value={{ locale: 'en', strings: {} }}>
            <HostContext value={host}>{children}</HostContext>
        </I18nContext>
    );
}

afterEach(cleanup);

function openPicker(onPick = vi.fn()) {
    render(<DynamicValuePicker type="text" label="Shop value" onPick={onPick} />, { wrapper: wrap() });
    fireEvent.click(screen.getByRole('button', { name: 'Shop value' }));

    return { onPick, search: screen.getByRole('combobox', { name: 'Search shop values' }) };
}

const optionNames = () =>
    screen.queryAllByRole('option').map((option) => option.textContent);

describe('the shop value picker', () => {
    it('lists the values of its type by group, each with what it is now', () => {
        const { search } = openPicker();

        expect(document.activeElement).toBe(search);
        expect(within(screen.getByRole('group', { name: 'Contact' })).getAllByRole('option').map((o) => o.textContent)).toEqual([
            'Phone012-345 6789',
            'Email',
        ]);
        expect(optionNames()).toEqual(['Phone012-345 6789', 'Email', 'Shop nameKedai Buku']);
    });

    it('finds values by label, key or what they are now as you type', () => {
        const { search } = openPicker();

        fireEvent.change(search, { target: { value: 'buku' } });
        expect(optionNames()).toEqual(['Shop nameKedai Buku']);

        fireEvent.change(search, { target: { value: 'site.em' } });
        expect(optionNames()).toEqual(['Email']);

        fireEvent.change(search, { target: { value: 'nothing like it' } });
        expect(optionNames()).toEqual([]);
        expect(screen.getByText('Nothing matches your search.')).toBeTruthy();
    });

    it('picks with the arrow keys and Enter, then closes', () => {
        const { search, onPick } = openPicker();

        fireEvent.keyDown(search, { key: 'ArrowDown' });
        fireEvent.keyDown(search, { key: 'ArrowDown' });
        fireEvent.keyDown(search, { key: 'ArrowUp' });
        fireEvent.keyDown(search, { key: 'ArrowDown' });

        expect(search.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[2].id);

        fireEvent.keyDown(search, { key: 'Enter' });

        expect(onPick).toHaveBeenCalledWith('site.name');
        expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('picks with a tap', () => {
        const { onPick } = openPicker();

        fireEvent.click(screen.getByRole('option', { name: /Phone/ }));

        expect(onPick).toHaveBeenCalledWith('site.phone');
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('closes on Escape and gives the focus back to its button', () => {
        const { search, onPick } = openPicker();

        fireEvent.keyDown(search, { key: 'Escape' });

        expect(screen.queryByRole('combobox')).toBeNull();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Shop value' }));
        expect(onPick).not.toHaveBeenCalled();
    });

    it('is not offered when the site has no value of its type', () => {
        render(<DynamicValuePicker type="image" label="Shop pictures" onPick={vi.fn()} />, { wrapper: wrap() });

        expect(screen.queryByRole('button', { name: 'Shop pictures' })).toBeNull();
    });
});
