import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_KIT } from '../src/lib/kit';
import { makeAdapter, mountBuilder } from './mount-helpers';

const LANGUAGES = [
    { locale: 'ms', label: 'Bahasa Melayu', url: '/admin/pages/1/build', current: true },
    { locale: 'en', label: 'English', url: '/admin/pages/9/build', current: false },
];

afterEach(() => vi.unstubAllGlobals());

describe('content language selection', () => {
    it('shows the selected language and links to a separate counterpart builder', async () => {
        mountBuilder({ languages: LANGUAGES });

        fireEvent.keyDown(screen.getByRole('button', { name: 'Content language: Bahasa Melayu' }), { key: 'Enter' });

        expect((await screen.findByRole('menuitem', { name: 'English' })).getAttribute('href')).toBe('/admin/pages/9/build');
        expect(screen.getByRole('menuitem', { name: 'Bahasa Melayu' }).getAttribute('aria-current')).toBe('page');
    });

    it('protects unsaved page content before opening another language', async () => {
        const { adapter } = mountBuilder({ languages: LANGUAGES });
        fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Hide section 1 from the page' }));
        fireEvent.keyDown(screen.getByRole('button', { name: 'Content language: Bahasa Melayu' }), { key: 'Enter' });
        fireEvent.click(await screen.findByRole('menuitem', { name: 'English' }));

        expect(await screen.findByText('Leave without saving?')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(adapter.save).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Content language: Bahasa Melayu' })).toBeTruthy();
    });

    it('creates only the requested draft after confirming unsaved changes, then opens a fresh editor', async () => {
        const navigate = vi.fn();
        vi.stubGlobal('window', new Proxy(window, {
            get(target, key) {
                return key === 'location' ? { assign: navigate } : Reflect.get(target, key);
            },
        }));
        const createTranslation = vi.fn(async (_locale: string) => ({ url: '/admin/pages/10/build' }));
        const adapter = { ...makeAdapter(), createTranslation };
        mountBuilder({ adapter, languages: [LANGUAGES[0], { ...LANGUAGES[1], url: null }] });
        fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Hide section 1 from the page' }));
        fireEvent.keyDown(screen.getByRole('button', { name: 'Content language: Bahasa Melayu' }), { key: 'Enter' });
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Create English draft' }));
        expect(createTranslation).not.toHaveBeenCalled();

        fireEvent.click(await screen.findByRole('button', { name: 'Leave' }));

        await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/admin/pages/10/build'));
        expect(createTranslation).toHaveBeenCalledExactlyOnceWith('en');
        expect(adapter.save).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Content language: Bahasa Melayu' })).toBeTruthy();
    });

    it('adds fallback templates in the selected content language while their names stay English', async () => {
        const { builder } = mountBuilder({ value: { sections: [] }, locale: 'en', contentLocale: 'ms' });
        fireEvent.click(screen.getByRole('button', { name: /^Hero/ }));

        expect(JSON.stringify(builder.getValue())).toContain('Tajuk besar halaman anda');
        expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    });

    it('warns again if content changed while a new language draft was being created', async () => {
        const navigate = vi.fn();
        vi.stubGlobal('window', new Proxy(window, {
            get: (target, key) => key === 'location' ? { assign: navigate } : Reflect.get(target, key),
        }));
        let finish: ((result: { url: string }) => void) | undefined;
        const createTranslation = vi.fn(() => new Promise<{ url: string }>((resolve) => { finish = resolve; }));
        mountBuilder({ adapter: { ...makeAdapter(), createTranslation }, languages: [LANGUAGES[0], { ...LANGUAGES[1], url: null }] });
        fireEvent.keyDown(screen.getByRole('button', { name: 'Content language: Bahasa Melayu' }), { key: 'Enter' });
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Create English draft' }));
        expect(createTranslation).toHaveBeenCalledExactlyOnceWith('en');
        fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Hide section 1 from the page' }));
        await act(async () => finish?.({ url: '/admin/pages/10/build' }));

        expect(await screen.findByText('Leave without saving?')).toBeTruthy();
        expect(navigate).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
        expect(navigate).toHaveBeenCalledWith('/admin/pages/10/build');
        expect(createTranslation).toHaveBeenCalledTimes(1);
    });

    it.each(['design', 'shop info'])('protects unsaved %s before changing language', async (area) => {
        const saveKit = vi.fn(async () => ({ ok: true as const }));
        const saveSiteInfo = vi.fn(async () => ({ ok: true as const }));
        const adapter = { ...makeAdapter(), saveKit, saveSiteInfo };
        mountBuilder({ adapter, kit: DEFAULT_KIT, languages: LANGUAGES, siteInfo: {
            groups: [{ key: 'contact', label: 'Contact', fields: [{ name: 'phone', type: 'text', label: 'Shop phone' }] }],
            values: { contact: { phone: '0123' } },
        } });
        const bar = within(screen.getByRole('banner'));
        if (area === 'design') {
            fireEvent.click(bar.getByRole('button', { name: 'Design' }));
            fireEvent.change(screen.getByLabelText('Primary colour code'), { target: { value: '#ff0000' } });
        } else {
            fireEvent.click(bar.getByRole('button', { name: 'Shop info' }));
            fireEvent.change(await screen.findByLabelText('Shop phone'), { target: { value: '0199' } });
        }
        fireEvent.keyDown(bar.getByRole('button', { name: 'Content language: Bahasa Melayu' }), { key: 'Enter' });
        fireEvent.click(await screen.findByRole('menuitem', { name: 'English' }));

        expect(await screen.findByText('Leave without saving?')).toBeTruthy();
        expect(saveKit).not.toHaveBeenCalled();
        expect(saveSiteInfo).not.toHaveBeenCalled();
        expect(adapter.save).not.toHaveBeenCalled();
    });

    it('hides the control when fewer than two valid languages remain', () => {
        mountBuilder({ languages: [LANGUAGES[0], { ...LANGUAGES[1], url: 'javascript:alert(1)' }] });
        expect(screen.queryByRole('button', { name: /Content language/ })).toBeNull();
    });

    it.each(['javascript:alert(1)', '//another-site.test/admin', ''])('keeps content when creation returns an invalid URL %s', async (url) => {
        const navigate = vi.fn();
        vi.stubGlobal('window', new Proxy(window, {
            get: (target, key) => key === 'location' ? { assign: navigate } : Reflect.get(target, key),
        }));
        const createTranslation = vi.fn(async () => ({ url }));
        const adapter = { ...makeAdapter(), createTranslation };
        const { builder } = mountBuilder({ adapter, languages: [LANGUAGES[0], { ...LANGUAGES[1], url: null }] });
        const before = builder.getValue();
        fireEvent.keyDown(screen.getByRole('button', { name: 'Content language: Bahasa Melayu' }), { key: 'Enter' });
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Create English draft' }));

        expect(await screen.findByRole('alert')).toBeTruthy();
        expect(navigate).not.toHaveBeenCalled();
        expect(adapter.save).not.toHaveBeenCalled();
        expect(builder.getValue()).toEqual(before);
        expect(screen.getByRole('button', { name: 'Content language: Bahasa Melayu' }).hasAttribute('disabled')).toBe(false);
    });
});
