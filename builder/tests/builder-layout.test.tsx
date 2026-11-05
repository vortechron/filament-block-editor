import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { clampSidebarWidth, SIDEBAR_WIDTH_KEY } from '../src/builder/sidebar-width';
import { mountBuilder, pickSection } from './mount-helpers';

const PAGE_MENU = [
    { title: 'Halaman utama', url: '/admin/site-pages/1/build', current: true },
    { title: 'Hubungi', url: '/admin/site-pages/7/build' },
    { title: 'Stationery', url: '/admin/site-pages/4/build' },
];

afterEach(() => window.localStorage.removeItem(SIDEBAR_WIDTH_KEY));

describe('the Add panel', () => {
    it('no longer says where a tapped section or item goes: the page scrolls to it instead', async () => {
        mountBuilder();

        expect(screen.queryByText('New sections go at the end of the page.')).toBeNull();

        await pickSection(/Selamat datang/);
        fireEvent.click(screen.getByRole('button', { name: 'Add' }));
        fireEvent.click(await screen.findByRole('tab', { name: 'Items' }));

        expect(screen.queryByText(/^Adds (to the end of|under the picked item in|after)/)).toBeNull();
        expect(screen.queryByRole('button', { name: 'Pick nothing' })).toBeNull();
    });
});

describe('the page title', () => {
    it('opens a list of the other pages to build, each a link to its builder', async () => {
        mountBuilder({ title: 'Halaman utama', pageMenu: PAGE_MENU });

        fireEvent.keyDown(screen.getByRole('button', { name: /Halaman utama/ }), { key: 'Enter' });

        const contact = await screen.findByRole('menuitem', { name: 'Hubungi' });

        expect(contact.getAttribute('href')).toBe('/admin/site-pages/7/build');
        expect(screen.getByRole('menuitem', { name: /Halaman utama/ }).getAttribute('aria-current')).toBe('page');
        expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    });

    it('asks first when there are changes not saved', async () => {
        mountBuilder({ title: 'Halaman utama', pageMenu: PAGE_MENU });

        fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Hide section 1 from the page' }));
        fireEvent.keyDown(screen.getByRole('button', { name: /Halaman utama/ }), { key: 'Enter' });
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Hubungi' }));

        expect(await screen.findByText('Leave without saving?')).toBeTruthy();
    });

    it('stays plain words with no other page to go to', () => {
        mountBuilder({ title: 'Halaman utama', pageMenu: PAGE_MENU.slice(0, 1) });

        expect(screen.getByRole('heading', { name: 'Halaman utama' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Halaman utama/ })).toBeNull();
    });
});

describe('the wide editor', () => {
    it('hides the page and gives the panel the whole width, until a screen size is picked again', () => {
        mountBuilder();

        const views = screen.getByRole('radiogroup', { name: 'View the page on' });

        fireEvent.click(within(views).getByRole('radio', { name: 'Edit without the page' }));

        expect(document.querySelector('[data-builder-canvas]')).toBeNull();
        expect(screen.getByRole('complementary', { name: 'Editor panels' }).getAttribute('data-wide')).toBe('true');
        expect(screen.queryByRole('separator', { name: 'Resize the editor panel' })).toBeNull();

        fireEvent.click(within(views).getByRole('radio', { name: 'Tablet' }));

        expect(document.querySelector('[data-builder-canvas]')).not.toBeNull();
    });
});

describe('the panel width', () => {
    it('is changed by dragging or with the arrow keys, kept for next time, and reset with Home', () => {
        mountBuilder();

        const handle = screen.getByRole('separator', { name: 'Resize the editor panel' });
        const start = Number(handle.getAttribute('aria-valuenow'));

        fireEvent.keyDown(handle, { key: 'ArrowRight' });
        fireEvent.keyDown(handle, { key: 'ArrowRight' });

        expect(Number(handle.getAttribute('aria-valuenow'))).toBe(start + 32);
        expect(window.localStorage.getItem(SIDEBAR_WIDTH_KEY)).toBe(String(start + 32));

        fireEvent.keyDown(handle, { key: 'Home' });

        expect(window.localStorage.getItem(SIDEBAR_WIDTH_KEY)).toBeNull();
    });

    it('keeps the panel between its narrowest and leaving room for the page', () => {
        expect(clampSidebarWidth(100, 1440)).toBe(280);
        expect(clampSidebarWidth(500, 1440)).toBe(500);
        expect(clampSidebarWidth(1400, 1440)).toBe(1440 - 360);
        expect(clampSidebarWidth(900, 600)).toBe(280);
    });
});
