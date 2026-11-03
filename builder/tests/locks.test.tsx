import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PageValueInput, SectionLock } from '../src/types';
import { loadCanvasPage, pageHtml } from './frame-helpers';
import { firstSection, makeAdapter, mountBuilder, pickSection } from './mount-helpers';

function pageWithLock(lock: SectionLock): PageValueInput {
    return {
        version: 2,
        sections: [
            {
                id: 'hero0001',
                type: 'rich',
                lock,
                data: {
                    layout: 'hero',
                    document: [
                        { type: 'heading', props: { level: 1 }, content: 'Selamat datang' },
                    ],
                },
            },
            {
                id: 'text0002',
                type: 'rich',
                data: {
                    layout: 'plain',
                    document: [{ type: 'heading', props: { level: 2 }, content: 'Tentang' }],
                },
            },
        ],
    };
}

const ALL_LOCKS: SectionLock = { move: true, remove: true, content: true, style: true };

/** Radix menus open on a key press in jsdom. */
function openMenu(name: string) {
    fireEvent.keyDown(screen.getByRole('button', { name }), { key: 'Enter' });
}

describe('locks, for a developer', () => {
    it('get a Lock menu on a section that sets each lock', async () => {
        const { builder } = mountBuilder({ developer: true, value: pageWithLock({}) });

        await pickSection(/Selamat datang/);
        openMenu('Lock');
        fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Moving' }));

        expect(firstSection(builder).lock).toEqual({ move: true });

        openMenu('Lock');
        fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Style' }));
        openMenu('Lock');
        fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Moving' }));

        expect(firstSection(builder).lock).toEqual({ style: true });
    });

    it('keep every control of a locked section', async () => {
        mountBuilder({ developer: true, value: pageWithLock(ALL_LOCKS) });

        await pickSection(/Selamat datang/);

        expect(screen.getByRole('button', { name: 'Move down' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Delete section' })).toBeTruthy();
        expect(screen.getByRole('tab', { name: 'Style' })).toBeTruthy();
        expect(screen.getByText('Words in this section')).toBeTruthy();
    });
});

describe('locks, for everyone else', () => {
    it('hide no control of an open section, and there is no Lock menu', async () => {
        mountBuilder({ value: pageWithLock({}) });

        await pickSection(/Selamat datang/);

        expect(screen.queryByRole('button', { name: 'Lock' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Move down' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Delete section' })).toBeTruthy();
        expect(screen.getByRole('tab', { name: 'Look' })).toBeTruthy();
    });

    it('hide what each lock blocks', async () => {
        mountBuilder({ value: pageWithLock(ALL_LOCKS) });

        await pickSection(/Selamat datang/);

        // move
        expect(screen.queryByRole('button', { name: 'Move down' })).toBeNull();
        // remove
        expect(screen.queryByRole('button', { name: 'Delete section' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Hide from the page' })).toBeNull();
        // content
        expect(screen.queryByText('Words in this section')).toBeNull();
        expect(screen.queryByText('Add to this section')).toBeNull();
        expect(screen.getByText('Locked')).toBeTruthy();
        // style
        expect(screen.queryByRole('tab', { name: 'Look' })).toBeNull();
        expect(screen.queryByRole('tab', { name: 'Style' })).toBeNull();
        expect(screen.queryByRole('tab', { name: 'Advanced' })).toBeNull();
    });

    it('never open an item of a section locked for content, whose words never load', async () => {
        const adapter = makeAdapter();
        const value = pageWithLock({ content: true }) as { sections: { data: { document: object[] } }[] };

        value.sections[0].data.document.push({ id: 'btn00001', type: 'button', props: { text: 'Beli', url: '' } });
        value.sections[1].data.document = [{ id: 'head0002', type: 'heading', props: { level: 2 }, content: 'Tentang' }];
        adapter.preview.mockImplementation(async () =>
            pageHtml(
                '<div data-block-id="hero0001"><section><h1 data-item="0">Selamat datang</h1><span data-item="1">Beli</span></section></div>' +
                    '<div data-block-id="text0002"><section><h2 data-item="0">Tentang</h2></section></div>',
            ),
        );
        mountBuilder({ adapter, value: value as PageValueInput });

        const page = await loadCanvasPage();

        fireEvent.click(page.querySelector('[data-block-id="hero0001"] [data-item="1"]') as Element);

        // The section opens with its Locked note: no item settings wait for its words.
        expect(await screen.findByText('Locked')).toBeTruthy();
        expect(screen.queryByRole('tab', { name: 'Settings' })).toBeNull();
        expect(document.querySelector('[data-slot="skeleton"]')).toBeNull();

        // Its line in the Structure tree has no items to open; an open section's has.
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));

        expect(screen.queryByRole('button', { name: 'Show items of section 1' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Show items of section 2' })).toBeTruthy();
    });

    it('take the drag handle and the eye of a locked section out of the Structure list', () => {
        mountBuilder({ value: pageWithLock({ move: true, remove: true }) });

        fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));

        const list = screen.getByRole('list');

        expect(within(list).queryByRole('button', { name: 'Move section 1' })).toBeNull();
        expect(
            within(list).queryByRole('button', { name: 'Hide section 1 from the page' }),
        ).toBeNull();
        expect(within(list).getByRole('button', { name: 'Move section 2' })).toBeTruthy();
    });

    it('lock only what is locked', async () => {
        mountBuilder({ value: pageWithLock({ content: true }) });

        await pickSection(/Selamat datang/);

        expect(screen.getByRole('button', { name: 'Move down' })).toBeTruthy();
        expect(screen.getByRole('tab', { name: 'Style' })).toBeTruthy();
        expect(screen.getByText('Locked')).toBeTruthy();
    });
});

describe('a copy of a locked section', () => {
    it('has no lock when someone else makes it, as the server will save it', async () => {
        const { builder } = mountBuilder({ value: pageWithLock({ content: true }) });

        await pickSection(/Selamat datang/);
        fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));

        const [original, copy] = builder.getValue().sections;

        expect(original).toMatchObject({ lock: { content: true } });
        expect('lock' in copy).toBe(false);
    });

    it('keeps the lock when a developer makes it', async () => {
        const { builder } = mountBuilder({
            developer: true,
            value: pageWithLock({ content: true }),
        });

        await pickSection(/Selamat datang/);
        fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));

        expect(builder.getValue().sections[1]).toMatchObject({ lock: { content: true } });
    });
});
