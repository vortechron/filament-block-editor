import { BlockNoteEditor } from '@blocknote/core';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createPageSchema } from '../src/editor/page-schema';
import { shopInfoSlashItems } from '../src/editor/dynamic-inline';
import type { DynamicValueDefinition, PageValueInput } from '../src/types';
import { firstSection, mountBuilder, pickSection } from './mount-helpers';

const VALUES: DynamicValueDefinition[] = [
    { key: 'site.phone', label: 'Phone', type: 'text', group: 'Shop', preview: '012-345 6789' },
    { key: 'site.name', label: 'Shop name', type: 'text', group: 'Shop', preview: null },
    { key: 'site.whatsapp', label: 'WhatsApp', type: 'link', group: 'Shop', preview: 'https://wa.me/60123456789' },
    { key: 'site.logo', label: 'Logo', type: 'image', group: 'Shop', preview: '/logo.png' },
];

const OWN_BLOCKS = [
    {
        kind: 'contact-card',
        label: 'Contact card',
        fields: [
            { name: 'link', label: 'Link', type: 'link' as const },
            { name: 'photo', label: 'Photo', type: 'image' as const },
        ],
    },
];

const PAGE: PageValueInput = {
    version: 2,
    sections: [
        {
            id: 'cont0001',
            type: 'rich',
            data: {
                layout: 'plain',
                document: [
                    { id: 'head0001', type: 'heading', props: { level: 2 }, content: 'Hubungi kami' },
                    {
                        id: 'para0001',
                        type: 'paragraph',
                        content: [
                            { type: 'text', text: 'Telefon: ', styles: {} },
                            { type: 'dynamic', props: { key: 'site.phone' } },
                        ],
                    },
                    { id: 'btn00001', type: 'button', props: { text: 'WhatsApp', url: '' } },
                    {
                        id: 'own00001',
                        type: 'ownBlock',
                        props: { kind: 'contact-card', values: '{}' },
                    },
                ],
            },
        },
    ],
};

type Builder = Parameters<typeof firstSection>[0];

function blockProps(builder: Builder, id: string): Record<string, unknown> {
    const block = firstSection(builder).data.document.find((entry) => entry.id === id) as {
        props: Record<string, unknown>;
    };

    return block.props;
}

/** Opens a shop value picker by its button and taps one of its values. */
async function pick(button: string, value: RegExp) {
    fireEvent.click(await screen.findByRole('button', { name: button }));
    fireEvent.click(within(screen.getByRole('listbox', { name: button })).getByRole('option', { name: value }));
}

describe('a dynamic value in text', () => {
    it('shows as a chip with its label and preview, and survives the editor as type dynamic', async () => {
        const { builder } = mountBuilder({ value: PAGE, dynamicValues: VALUES, blocks: OWN_BLOCKS });

        await pickSection(/Hubungi kami/);

        const chip = await waitFor(() => {
            const found = document.querySelector('[data-section-editor] [data-dynamic="site.phone"]');

            expect(found).not.toBeNull();

            return found as HTMLElement;
        });

        expect(chip.textContent).toContain('Phone');
        expect(chip.textContent).toContain('012-345 6789');

        // Any change makes the editor write its whole document back.
        fireEvent.click(screen.getByRole('button', { name: 'Add' }));
        fireEvent.click(await screen.findByRole('tab', { name: 'Items' }));
        fireEvent.click(screen.getByRole('button', { name: 'Line' }));

        await waitFor(() =>
            expect(firstSection(builder).data.document.some((entry) => entry.type === 'divider')).toBe(true),
        );

        const paragraph = firstSection(builder).data.document.find(
            (entry) => entry.id === 'para0001',
        ) as { content: unknown[] };

        expect(paragraph.content).toContainEqual({ type: 'dynamic', props: { key: 'site.phone' } });
    });

    it('is offered in a Shop info group of the / menu, text values only', () => {
        const editor = BlockNoteEditor.create({
            schema: createPageSchema(),
            initialContent: [{ id: 'p1', type: 'paragraph', content: 'Hubungi ' }],
        });
        const items = shopInfoSlashItems(editor, (text) => text, VALUES);

        expect(items.map((item) => [item.title, item.group])).toEqual([
            ['Phone', 'Shop info'],
            ['Shop name', 'Shop info'],
        ]);

        editor.setTextCursorPosition('p1', 'end');
        items[0].onItemClick();

        expect(editor.document[0].content).toContainEqual({
            type: 'dynamic',
            props: { key: 'site.phone' },
        });
    });
});

describe('a dynamic value in a link or a picture', () => {
    it('is picked for a button from the shop links, stored as @key and shown by its label', async () => {
        const { builder } = mountBuilder({ value: PAGE, dynamicValues: VALUES, blocks: OWN_BLOCKS });

        await pickSection(/Hubungi kami/);
        fireEvent.click(await screen.findByRole('button', { name: 'Change link' }));
        await pick('Shop links', /WhatsApp/);

        expect(blockProps(builder, 'btn00001').url).toBe('@site.whatsapp');

        const chip = screen.getByRole('group', { name: 'Link' });

        expect(within(chip).getByText('WhatsApp')).toBeTruthy();
        expect(screen.queryByDisplayValue('@site.whatsapp')).toBeNull();
        expect(screen.queryByText(/This link will not work/)).toBeNull();

        fireEvent.click(within(chip).getByRole('button', { name: 'Remove shop link' }));

        expect(blockProps(builder, 'btn00001').url).toBe('');
    });

    it('is offered in an own block’s link and picture fields', async () => {
        const { builder } = mountBuilder({ value: PAGE, dynamicValues: VALUES, blocks: OWN_BLOCKS });

        await pickSection(/Hubungi kami/);
        fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
        await pick('Shop links', /WhatsApp/);
        await pick('Shop pictures', /Logo/);

        expect(JSON.parse(String(blockProps(builder, 'own00001').values))).toMatchObject({
            link: '@site.whatsapp',
            photo: '@site.logo',
        });
    });

    it('offers no shop pictures when the site has none', async () => {
        mountBuilder({
            value: PAGE,
            dynamicValues: VALUES.filter((value) => value.type !== 'image'),
            blocks: OWN_BLOCKS,
        });

        await pickSection(/Hubungi kami/);
        fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

        expect(screen.getByRole('button', { name: 'Shop links' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Shop pictures' })).toBeNull();
    });
});
